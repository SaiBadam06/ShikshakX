// This API client uses Groq AI for all RAG, assessment, and planning features.
import { groq, GROQ_MODEL, retryWithBackoff } from './groqService';
import { db } from './firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import type { AssessmentQuiz, PlanTask, Material, Note } from '../types';
import type { User } from 'firebase/auth';

if (!groq) {
  console.error('❌ Groq API key is missing. Please check your .env file and ensure VITE_GROQ_API_KEY is set.');
}

export const apiClient = {
  // RAG Chat using Groq
  ragChat: async (queryText: string, scope: string, user: User): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    if (!groq) {
      throw new Error('Groq AI client is not initialized. VITE_GROQ_API_KEY may be missing.');
    }

    console.log(`[AI] RAG Chat query for user ${user.uid}: "${queryText}" with scope: "${scope}"`);

    // Web scope: answer using general knowledge (no grounding available in Groq)
    if (scope === 'Web') {
      try {
        const response = await retryWithBackoff(() =>
          groq!.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant. Answer the user\'s question thoroughly.' },
              { role: 'user', content: queryText }
            ],
          })
        );
        return { text: response.choices[0]?.message?.content || 'No response.', sources: [] };
      } catch (error: any) {
        console.error('Error with Groq web search:', error);
        return { text: 'Sorry, I encountered an error while answering. Please try again.', sources: [] };
      }
    }

    // Local RAG using Firestore documents
    const userDocRef = doc(db, 'users', user.uid);
    let contextText = '';
    const sources: { title: string; uri: string }[] = [];
    let contextDocs: any[] = [];

    try {
      const maxDocs = 25;
      if (scope === 'Course') {
        const materialsQuery = query(collection(userDocRef, 'materials'), orderBy('createdAt', 'desc'), limit(maxDocs));
        const querySnapshot = await getDocs(materialsQuery);
        contextDocs = querySnapshot.docs.map(d => d.data() as Material);
      } else if (scope === 'My Notes') {
        const notesQuery = query(collection(userDocRef, 'notes'), orderBy('createdAt', 'desc'), limit(maxDocs));
        const querySnapshot = await getDocs(notesQuery);
        contextDocs = querySnapshot.docs.map(d => d.data() as Note);
      }

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
    if (!groq) {
      throw new Error('Groq AI client is not initialized. VITE_GROQ_API_KEY may be missing.');
    }

    console.log(`[AI] Summarizing materials for user ${user.uid}: ${materialIds.join(', ')} with format: ${format}`);

    try {
      let contextText = '';
      const userDocRef = doc(db, 'users', user.uid);

      for (const id of materialIds) {
        const docRef = doc(userDocRef, 'materials', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const material = docSnap.data() as Material;
          if (material.content) {
            contextText += `--- START OF DOCUMENT: "${material.name}" ---\n${material.content}\n--- END OF DOCUMENT ---\n\n`;
          }
        }
      }

      if (!contextText.trim()) {
        return 'The selected materials do not contain any text content to summarize.';
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
      throw new Error('Failed to generate AI summary. Please check the content of your materials and try again.');
    }
  },

  // Generate assessment quiz using Groq
  generateAssessment: async (topic: string, numQuestions: number): Promise<AssessmentQuiz> => {
    if (!groq) {
      throw new Error('Groq AI client is not initialized. VITE_GROQ_API_KEY may be missing.');
    }

    console.log(`[AI] Generating assessment for topic: "${topic}" with ${numQuestions} questions.`);

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
- Return ONLY valid JSON, no markdown fences`;

    try {
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

      return quizData as AssessmentQuiz;
    } catch (error: any) {
      console.error('Error generating assessment with AI:', error);
      throw new Error('Failed to generate AI assessment. Please try again.');
    }
  },

  // Generate study plan using Groq
  generatePlan: async (topic: string, duration: number): Promise<PlanTask[]> => {
    if (!groq) {
      throw new Error('Groq AI client is not initialized. VITE_GROQ_API_KEY may be missing.');
    }

    console.log(`[AI] Generating a ${duration}-day plan for topic: "${topic}"`);

    const prompt = `Create a detailed, day-by-day study plan for learning "${topic}" over ${duration} days.

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
      throw new Error('Failed to generate AI plan. Please try again.');
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