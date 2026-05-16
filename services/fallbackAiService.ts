import type { AssessmentQuiz, Material, Note, PlanTask } from '../types';

type ContextDocument = Pick<Material, 'name' | 'content' | 'url'> | Pick<Note, 'title' | 'content'>;

const FALLBACK_RESPONSES: Record<string, string> = {
  hello: "Hello! I'm your AI tutor. I'm having trouble reaching the live model right now, but I can still help with study-focused guidance.",
  help: "I can still help with study planning, summaries, and course-focused questions. Ask about a topic you're learning or select your materials for grounded answers.",
  math: "I can help with math topics. Try asking something specific, like how to solve a type of equation or why a theorem works.",
  science: "I can help with science concepts too. Ask about the process, principle, or comparison you want to understand.",
  history: "I can help with history by comparing events, causes, timelines, and outcomes. Tell me the topic you want to revise.",
  default: "The live AI service is unavailable right now, but I can still help with a simpler study-focused response.",
};

const stopWords = new Set([
  'about', 'after', 'again', 'also', 'been', 'being', 'from', 'into', 'that', 'their', 'there', 'these', 'this',
  'what', 'when', 'where', 'which', 'while', 'with', 'would', 'could', 'should', 'have', 'your', 'you', 'them',
  'they', 'were', 'will', 'just', 'than', 'then', 'some', 'such', 'more', 'much', 'very', 'over', 'under',
]);

const tokenize = (value: string): string[] => {
  const matches = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return matches.filter((token: string) => token.length > 2 && !stopWords.has(token));
};

const splitSentences = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const scoreText = (text: string, queryTokens: string[]) => {
  const textTokens = tokenize(text);
  const uniqueTokens = new Set(textTokens);
  return queryTokens.reduce((score, token) => score + (uniqueTokens.has(token) ? 1 : 0), 0);
};

const getDocumentTitle = (document: ContextDocument) => ('name' in document ? document.name : document.title);
const getDocumentUrl = (document: ContextDocument) => ('url' in document ? document.url || '#' : '#');

export const getFallbackResponse = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('math') || lowerPrompt.includes('calculate')) {
    return FALLBACK_RESPONSES.math;
  }

  if (lowerPrompt.includes('science') || lowerPrompt.includes('physics') || lowerPrompt.includes('chemistry') || lowerPrompt.includes('biology')) {
    return FALLBACK_RESPONSES.science;
  }

  if (lowerPrompt.includes('history') || lowerPrompt.includes('war') || lowerPrompt.includes('century') || lowerPrompt.includes('ancient')) {
    return FALLBACK_RESPONSES.history;
  }

  if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
    return FALLBACK_RESPONSES.hello;
  }

  if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do')) {
    return FALLBACK_RESPONSES.help;
  }

  return FALLBACK_RESPONSES.default;
};

export const getFallbackRagResponse = (
  prompt: string,
  documents: ContextDocument[],
  scope: string,
): { text: string; sources: { title: string; uri: string }[] } => {
  if (!documents.length) {
    return {
      text: `I couldn't find any materials in "${scope}" to answer that yet. Try adding notes or materials first.`,
      sources: [],
    };
  }

  const queryTokens = tokenize(prompt);
  const ranked = documents
    .map((document) => {
      const title = getDocumentTitle(document);
      const content = document.content || '';
      const sentences = splitSentences(content);
      const bestSentences = sentences
        .map((sentence) => ({ sentence, score: scoreText(sentence, queryTokens) }))
        .sort((left, right) => right.score - left.score)
        .filter((entry) => entry.score > 0)
        .slice(0, 2)
        .map((entry) => entry.sentence);

      return {
        title,
        uri: getDocumentUrl(document),
        score: Math.max(scoreText(`${title} ${content}`, queryTokens), bestSentences.length),
        excerpts: bestSentences,
      };
    })
    .sort((left, right) => right.score - left.score);

  const bestMatches = ranked.filter((entry) => entry.score > 0).slice(0, 3);
  const sources = (bestMatches.length ? bestMatches : ranked.slice(0, 3)).map(({ title, uri }) => ({ title, uri }));

  if (!bestMatches.length) {
    return {
      text: `I couldn't find a direct answer in the selected ${scope.toLowerCase()} materials. Try rephrasing your question or adding more detailed notes.`,
      sources,
    };
  }

  const bulletPoints = bestMatches
    .flatMap((match) => match.excerpts.map((excerpt) => `- ${excerpt}`))
    .slice(0, 5)
    .join('\n');

  return {
    text: `I couldn't reach the live AI model, but based on your materials I found these relevant points:\n\n${bulletPoints}`,
    sources,
  };
};

export const buildFallbackSummary = (
  documents: { title: string; content: string }[],
  format: 'paragraph' | 'bullets' | 'flashcards',
) => {
  const sentences = documents.flatMap((document) => splitSentences(document.content)).slice(0, 10);
  const safeSentences = sentences.length ? sentences : ['The selected materials do not contain enough text to produce a strong summary yet.'];

  if (format === 'flashcards') {
    return safeSentences.slice(0, 5).map((sentence, index) => {
      const title = documents[index]?.title || `Concept ${index + 1}`;
      return `${title} /// ${sentence}`;
    }).join('\n---\n');
  }

  if (format === 'bullets') {
    return `### Key Takeaways\n${safeSentences.slice(0, 6).map((sentence) => `*   ${sentence}`).join('\n')}`;
  }

  return `### Summary\n${safeSentences.slice(0, 5).join(' ')}`;
};

export const buildFallbackAssessment = (topic: string, numQuestions: number): AssessmentQuiz => {
  const questionTemplates = [
    {
      question: `Which approach is the best first step when beginning to study ${topic}?`,
      options: [
        `Understand the core concepts and vocabulary of ${topic}`,
        'Memorize unrelated facts without context',
        'Skip foundational ideas and only review edge cases',
        'Avoid checking examples or applications',
      ],
      correctAnswer: `Understand the core concepts and vocabulary of ${topic}`,
      explanation: `A strong foundation makes the rest of ${topic} easier to understand and apply.`,
    },
    {
      question: `Why is structured practice important when learning ${topic}?`,
      options: [
        'It helps reinforce understanding over time',
        'It removes the need for any revision',
        'It guarantees instant mastery after one session',
        'It only matters for advanced learners',
      ],
      correctAnswer: 'It helps reinforce understanding over time',
      explanation: 'Repeated, structured practice improves retention and transfer of knowledge.',
    },
    {
      question: `Which learning habit usually improves retention in ${topic}?`,
      options: [
        'Reviewing concepts in spaced intervals',
        'Cramming everything once and never revisiting it',
        'Avoiding self-testing',
        'Skipping reflection after practice',
      ],
      correctAnswer: 'Reviewing concepts in spaced intervals',
      explanation: 'Spacing and retrieval practice are reliable ways to strengthen long-term memory.',
    },
    {
      question: `What is a strong sign that someone understands ${topic} well?`,
      options: [
        'They can explain ideas clearly in their own words',
        'They only recognize terms when reading them',
        'They avoid examples and applications',
        'They rely entirely on memorized wording',
      ],
      correctAnswer: 'They can explain ideas clearly in their own words',
      explanation: 'Explaining a concept clearly shows deeper understanding than simple recognition.',
    },
    {
      question: `Which study strategy is most useful after making mistakes in ${topic}?`,
      options: [
        'Review why the mistake happened and correct the reasoning',
        'Ignore the mistake and move on immediately',
        'Repeat the same approach without reflection',
        'Only focus on content that already feels easy',
      ],
      correctAnswer: 'Review why the mistake happened and correct the reasoning',
      explanation: 'Mistake review helps uncover gaps and improves future performance.',
    },
  ];

  return {
    topic,
    questions: Array.from({ length: numQuestions }, (_, index) => questionTemplates[index % questionTemplates.length]),
  };
};

export const buildFallbackPlan = (topic: string, duration: number, scope = ''): PlanTask[] => {
  const goal = scope.trim();
  const weeklyPhases = [
    {
      label: 'Foundation',
      action: `understand the basics of ${topic}, the key terms, and why the subject matters`,
    },
    {
      label: 'Core Concepts',
      action: `study the main building blocks of ${topic} and connect them with simple examples`,
    },
    {
      label: 'Guided Practice',
      action: `work through beginner-friendly exercises and note where you get stuck`,
    },
    {
      label: 'Real Use',
      action: goal
        ? `apply ${topic} toward your goal of ${goal} with one small practical task`
        : `apply ${topic} to a small practical example so the ideas feel real`,
    },
    {
      label: 'Review',
      action: `revisit mistakes, simplify your notes, and test yourself without relying on memory alone`,
    },
    {
      label: 'Build',
      action: goal
        ? `create a small beginner project connected to ${goal}`
        : `create a tiny project or output that proves you can use what you learned`,
    },
    {
      label: 'Reflect',
      action: `review progress, identify weak spots, and decide what to learn next`,
    },
  ];

  return Array.from({ length: duration }, (_, index) => {
    const day = index + 1;
    const phase = weeklyPhases[index % weeklyPhases.length];
    const timeEstimate = day <= 2 ? '45 minutes' : day % 3 === 0 ? '75 minutes' : '60 minutes';
    const scopeSentence = goal
      ? ` Keep the final outcome focused on ${goal}.`
      : '';

    return {
      day,
      title: `Day ${day}: ${phase.label} for ${topic}`,
      description: `Assume you are starting ${topic} from scratch. Use today to ${phase.action}.${scopeSentence} End by writing 2-3 takeaways and one question to revisit tomorrow.`,
      duration: timeEstimate,
    };
  });
};
