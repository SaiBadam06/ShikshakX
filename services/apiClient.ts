// This API client uses Groq AI for all RAG, assessment, and planning features.
import { groq, GROQ_MODEL, retryWithBackoff } from './groqService';
import { db } from './firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import type { AssessmentQuiz, PlanTask, Material, Note } from '../types';
import type { User } from 'firebase/auth';
import { buildFallbackPlan, buildFallbackSummary, getFallbackRagResponse } from './fallbackAiService';

if (!groq) {
  console.warn('Groq API key is missing. AI features will use simplified local fallbacks.');
}

const normalizeQuestion = (question: string) =>
  question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

type WebSource = {
  title: string;
  uri: string;
  content: string;
};

const fetchWebSources = async (queryText: string): Promise<WebSource[]> => {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
  searchUrl.search = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: queryText,
    format: 'json',
    origin: '*',
    utf8: '1',
    srlimit: '5',
  }).toString();

  const searchResponse = await fetch(searchUrl.toString());
  if (!searchResponse.ok) {
    throw new Error('Wikipedia search failed.');
  }

  const searchPayload = await searchResponse.json();
  const searchResults = searchPayload?.query?.search ?? [];

  if (!searchResults.length) {
    return [];
  }

  const pageIds = searchResults
    .map((result: { pageid?: number }) => result.pageid)
    .filter(Boolean)
    .join('|');

  if (!pageIds) {
    return [];
  }

  const detailsUrl = new URL('https://en.wikipedia.org/w/api.php');
  detailsUrl.search = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    inprop: 'url',
    explaintext: '1',
    exintro: '1',
    pageids: pageIds,
    format: 'json',
    origin: '*',
  }).toString();

  const detailsResponse = await fetch(detailsUrl.toString());
  if (!detailsResponse.ok) {
    throw new Error('Wikipedia details lookup failed.');
  }

  const detailsPayload = await detailsResponse.json();
  const pages = Object.values(detailsPayload?.query?.pages ?? {}) as Array<{
    pageid?: number;
    title?: string;
    fullurl?: string;
    extract?: string;
  }>;

  return pages
    .filter((page) => page.title && page.extract)
    .slice(0, 4)
    .map((page) => ({
      title: page.title as string,
      uri: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
      content: (page.extract as string).trim(),
    }));
};

const loadContextDocuments = async (scope: string, user: User): Promise<(Material | Note)[]> => {
  const userDocRef = doc(db, 'users', user.uid);
  const maxDocs = 25;

  if (scope === 'Course') {
    const materialsQuery = query(collection(userDocRef, 'materials'), orderBy('createdAt', 'desc'), limit(maxDocs));
    const querySnapshot = await getDocs(materialsQuery);
    return querySnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as Material));
  }

  if (scope === 'My Notes') {
    const notesQuery = query(collection(userDocRef, 'notes'), orderBy('createdAt', 'desc'), limit(maxDocs));
    const querySnapshot = await getDocs(notesQuery);
    return querySnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as Note));
  }

  return [];
};

export const apiClient = {
  // RAG Chat using Groq
  ragChat: async (queryText: string, scope: string, user: User): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    console.log(`[AI] RAG Chat query for user ${user.uid}: "${queryText}" with scope: "${scope}"`);

    // Web scope: answer using retrieved public web sources
    if (scope === 'Web') {
      try {
        const webSources = await fetchWebSources(queryText);
        if (!webSources.length) {
          return {
            text: 'I could not find relevant web sources for that question right now. Try a more specific query.',
            sources: [],
          };
        }

        const sources = webSources.map(({ title, uri }) => ({ title, uri }));
        const contextText = webSources
          .map(({ title, content, uri }) => `SOURCE: ${title}\nURL: ${uri}\nCONTENT:\n${content}`)
          .join('\n\n---\n\n');

        if (!groq) {
          return {
            text: `I found these web references, but a live AI model is needed to synthesize the answer.\n\n${sources.map((source, index) => `${index + 1}. ${source.title}`).join('\n')}`,
            sources,
          };
        }

        const response = await retryWithBackoff(() =>
          groq!.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a source-grounded assistant. Answer using only the provided web sources. If the answer is uncertain or missing, say so clearly.',
              },
              {
                role: 'user',
                content: `QUESTION: ${queryText}\n\nWEB SOURCES:\n${contextText}\n\nWrite a clear answer based on these sources only.`,
              }
            ],
          })
        );

        return {
          text: response.choices[0]?.message?.content || 'No response.',
          sources,
        };
      } catch (error: any) {
        console.error('Error with Groq web search:', error);
        return { text: 'Sorry, I encountered an error while answering. Please try again.', sources: [] };
      }
    }

    // Local RAG using Firestore documents
    let contextText = '';

    try {
      const contextDocs = await loadContextDocuments(scope, user);
      const sources: { title: string; uri: string }[] = [];

      contextDocs.forEach(d => {
        const title = (d as Material).name || (d as Note).title;
        const content = (d as Material).content || (d as Note).content || '';
        const url = (d as Material).url || '#';
        contextText += `--- START OF DOCUMENT: "${title}" ---\n${content || 'No text content available.'}\n--- END OF DOCUMENT ---\n\n`;
        sources.push({ title, uri: url });
      });

      if (contextDocs.length === 0) {
        return {
          text: `I couldn't find any materials in the scope "${scope}" to answer your question. Please add some notes or materials first.`,
          sources: []
        };
      }

      if (!groq) {
        return getFallbackRagResponse(queryText, contextDocs, scope);
      }

      const prompt = `You are an expert Q&A system. Answer the user's question based ONLY on the provided documents. If the answer cannot be found in the documents, say "I could not find an answer in the provided materials."

QUESTION: "${queryText}"

DOCUMENTS:
${contextText}

ANSWER:`;

      const response = await retryWithBackoff(() =>
        groq!.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are an expert academic Q&A assistant. Answer questions based only on the provided context.' },
            { role: 'user', content: prompt }
          ],
        })
      );

      return {
        text: response.choices[0]?.message?.content || 'No response.',
        sources,
      };
    } catch (error: any) {
      console.error(`Error fetching context or calling Groq for scope ${scope}:`, error);
      return { text: 'Sorry, I had trouble finding your materials or generating an answer. Please try again.', sources: [] };
    }
  },

  // Summarize materials using Groq
  summarize: async (materialIds: string[], format: 'paragraph' | 'bullets' | 'flashcards', user: User): Promise<string> => {
    console.log(`[AI] Summarizing materials for user ${user.uid}: ${materialIds.join(', ')} with format: ${format}`);

    try {
      let contextText = '';
      const userDocRef = doc(db, 'users', user.uid);
      const fallbackDocuments: { title: string; content: string }[] = [];

      for (const id of materialIds) {
        const docRef = doc(userDocRef, 'materials', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const material = docSnap.data() as Material;
          if (material.content) {
            contextText += `--- START OF DOCUMENT: "${material.name}" ---\n${material.content}\n--- END OF DOCUMENT ---\n\n`;
            fallbackDocuments.push({ title: material.name, content: material.content });
          }
        }
      }

      if (!contextText.trim()) {
        return 'The selected materials do not contain any text content to summarize.';
      }

      if (!groq) {
        return buildFallbackSummary(fallbackDocuments, format);
      }

      let formatInstruction = '';
      switch (format) {
        case 'bullets':
          formatInstruction = 'Generate a summary as a concise list of the most important key takeaways, using bullet points (*). Start with a title like "### Key Takeaways".';
          break;
        case 'flashcards':
          formatInstruction = 'Generate a summary in a flashcard format. For each key concept, provide a term followed by "///" and then its definition. Separate each flashcard with "---".';
          break;
        default:
          formatInstruction = 'Generate a summary as a well-written, coherent paragraph. Start with a title like "### Summary".';
      }

      const prompt = `You are an expert academic summarizer. Read the following documents and generate a summary.\n\nDOCUMENTS:\n${contextText}\n\nINSTRUCTION:\n${formatInstruction}\n\nSUMMARY:`;

      const response = await retryWithBackoff(() =>
        groq!.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are an expert academic summarizer.' },
            { role: 'user', content: prompt }
          ],
        })
      );

      return response.choices[0]?.message?.content || 'Failed to generate summary.';
    } catch (error: any) {
      console.error('Error generating summary with AI:', error);
      const fallbackDocuments = materialIds.length
        ? await Promise.all(materialIds.map(async (id) => {
            const snapshot = await getDoc(doc(doc(db, 'users', user.uid), 'materials', id));
            if (!snapshot.exists()) {
              return null;
            }

            const material = snapshot.data() as Material;
            return material.content ? { title: material.name, content: material.content } : null;
          }))
        : [];

      const filteredDocuments = fallbackDocuments.filter(Boolean) as { title: string; content: string }[];
      if (filteredDocuments.length) {
        return buildFallbackSummary(filteredDocuments, format);
      }

      throw new Error('Failed to generate AI summary. Please check the content of your materials and try again.');
    }
  },

  // Generate assessment quiz using Groq
  generateAssessment: async (topic: string, numQuestions: number, disallowedQuestions: string[] = []): Promise<AssessmentQuiz> => {
    console.log(`[AI] Generating assessment for topic: "${topic}" with ${numQuestions} questions.`);

    if (!groq) {
      throw new Error('AI quiz generation is unavailable because no live model is configured.');
    }

    const recentQuestionBlock = disallowedQuestions.length
      ? `Avoid asking or closely paraphrasing any of these recent questions:\n${disallowedQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}\n`
      : 'No previous questions are blocked.\n';

    const prompt = `Generate a multiple-choice quiz with exactly ${numQuestions} questions on the topic "${topic}".

Return a JSON object in this EXACT format (no extra text, just valid JSON):
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of why Option A is correct."
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- The correctAnswer must be exactly one of the 4 options (copy it exactly)
- Generate exactly ${numQuestions} questions
- Make the questions meaningfully different from one another
- Do not repeat or closely paraphrase any blocked question
- Return ONLY valid JSON, no markdown fences

Blocked recent questions:
${recentQuestionBlock}`;

    try {
      const blockedSet = new Set(disallowedQuestions.map(normalizeQuestion));

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await retryWithBackoff(() =>
          groq!.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: 'You are an expert quiz generator. Always respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
          })
        );

        const raw = response.choices[0]?.message?.content || '';
        const quizData = JSON.parse(raw);

        if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error('AI returned an invalid quiz structure.');
        }

        const normalizedGeneratedQuestions = quizData.questions.map((question: { question: string }) => normalizeQuestion(question.question));
        const hasDuplicateWithinQuiz = new Set(normalizedGeneratedQuestions).size !== normalizedGeneratedQuestions.length;
        const repeatsBlockedQuestion = normalizedGeneratedQuestions.some((question: string) => blockedSet.has(question));

        if (!hasDuplicateWithinQuiz && !repeatsBlockedQuestion) {
          return quizData as AssessmentQuiz;
        }
      }

      throw new Error('AI kept generating repeated questions.');
    } catch (error: any) {
      console.error('Error generating assessment with AI:', error);
      throw new Error('Failed to generate a fresh AI quiz. Please try again.');
    }
  },

  // Generate study plan using Groq
  generatePlan: async (topic: string, duration: number, scope = ''): Promise<PlanTask[]> => {
    console.log(`[AI] Generating a ${duration}-day beginner plan for topic: "${topic}" with scope: "${scope}"`);

    if (!groq) {
      return buildFallbackPlan(topic, duration, scope);
    }

    const learnerScope = scope.trim()
      ? `The learner's target scope or goal is: "${scope}".`
      : 'No extra goal was provided, so keep the path practical and beginner-friendly.';

    const prompt = `Create a detailed, day-by-day study plan for learning "${topic}" over ${duration} days.

Assume the learner is a complete beginner starting from scratch.
${learnerScope}
The plan should move in a clear order: fundamentals -> core ideas -> guided practice -> practical use -> revision.

Return a JSON array in this EXACT format (no extra text, just valid JSON):
[
  {
    "day": 1,
    "title": "Task title",
    "description": "What to do today",
    "duration": "60 minutes"
  }
]

Rules:
- Generate at least one task per day, up to ${duration} days
- Keep descriptions practical and actionable
- Make the first part of the plan beginner-safe and foundational
- Gradually increase difficulty across the days
- If a goal/scope is provided, connect later tasks to that goal
- Each task should feel like part of a real learning path, not isolated tips
- Return ONLY valid JSON array, no markdown fences`;

    try {
      const response = await retryWithBackoff(() =>
        groq!.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are an expert study planner. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        })
      );

      const raw = response.choices[0]?.message?.content || '';
      let planData = JSON.parse(raw);

      // Groq json_object mode wraps in an object — handle both array and { plan: [...] }
      if (!Array.isArray(planData)) {
        planData = planData.plan || planData.tasks || planData.studyPlan || Object.values(planData)[0];
      }

      if (!Array.isArray(planData) || planData.length === 0) {
        throw new Error('AI returned an invalid plan structure.');
      }

      return planData as PlanTask[];
    } catch (error: any) {
      console.error('Error generating plan with AI:', error);
      return buildFallbackPlan(topic, duration, scope);
    }
  },

  // Simulates file ingestion for RAG
  ingestFile: async (materialId: string, user: User): Promise<{ success: boolean; message: string }> => {
    console.log(`[MOCK] Ingesting material ID "${materialId}" for user ${user.uid} into vector DB.`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return {
      success: true,
      message: `Material ${materialId} has been successfully processed and is now available for Q&A.`
    };
  }
};
