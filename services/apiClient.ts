// This API client now uses live AI for RAG and planning features.
import { GoogleGenAI, Type } from "@google/genai";
import { db } from './firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import type { AssessmentQuiz, PlanTask, Material, Note } from '../types';
import type { User } from 'firebase/auth';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Validate API key format
const isValidApiKey = API_KEY && API_KEY.startsWith('AIza') && API_KEY.length > 30;

// Initialize AI client only if we have a valid-looking API key
const ai = isValidApiKey ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Add error logging for API key issues
if (!API_KEY) {
  console.error('❌ Gemini API key is missing. Please check your .env file and ensure VITE_GEMINI_API_KEY is set.');
} else if (!isValidApiKey) {
  console.error('❌ Invalid Gemini API key format. The key should start with "AIza" and be at least 30 characters long.');
  console.log('Current API key starts with:', API_KEY.substring(0, 10) + '...');
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastRetry = i === retries - 1;
      
      // Parse error structure - Gemini returns ApiError with nested error object
      let errorCode = 0;
      let errorStatus = '';
      let errorMessage = error?.message || '';
      
      // Try to parse the error details
      try {
        // Check if error.message contains JSON
        if (errorMessage.includes('{') && errorMessage.includes('error')) {
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const errorDetails = JSON.parse(jsonMatch[0]);
            errorCode = errorDetails?.error?.code || 0;
            errorStatus = errorDetails?.error?.status || '';
          }
        }
        
        // Also check direct properties
        errorCode = errorCode || error?.error?.code || error?.code || 0;
        errorStatus = errorStatus || error?.error?.status || error?.status || '';
      } catch (parseError) {
        // If parsing fails, continue with string matching
      }
      
      // Check for retryable errors (503, overloaded, UNAVAILABLE)
      const isRetryableError = 
        errorCode === 503 ||
        errorStatus === 'UNAVAILABLE' ||
        errorMessage.includes('503') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('UNAVAILABLE') ||
        String(error).includes('503') ||
        String(error).includes('UNAVAILABLE');

      if (!isRetryableError || isLastRetry) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, i);
      console.log(`🔄 API overloaded. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
      await delay(delayMs);
    }
  }
  throw new Error('Max retries reached');
}


export const apiClient = {
  // Implements a functional RAG pipeline using Firestore for context and Google Search for web queries.
  ragChat: async (queryText: string, scope: string, user: User): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    if (!ai) {
      throw new Error("Gemini AI client is not initialized. API_KEY may be missing.");
    }
    
    console.log(`[AI] RAG Chat query for user ${user.uid}: "${queryText}" with scope: "${scope}"`);

    // Handle web search using Google Search grounding
    if (scope === 'Web') {
      try {
        const response = await retryWithBackoff(async () => {
          return await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: queryText,
              config: {
                  tools: [{ googleSearch: {} }],
              },
          });
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((chunk: any) => chunk.web)
            .filter(Boolean)
            .map((web: any) => ({ title: web.title, uri: web.uri }))
            .filter((source: any, index: number, self: any[]) => 
                index === self.findIndex((s) => s.uri === source.uri)
            );

        return {
            text: response.text,
            sources: sources,
        };
      } catch (error: any) {
        console.error("Error with Google Search grounding:", error);
        
        // Provide specific error message for overload errors
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
          return { 
            text: "The AI service is experiencing high demand. I've tried multiple times but couldn't connect. Please wait a moment and try your search again.", 
            sources: [] 
          };
        }
        
        return { text: "Sorry, I encountered an error while searching the web. Please try again.", sources: [] };
      }
    }

    // Handle local RAG using Firestore documents from the specific user
    const userDocRef = doc(db, 'users', user.uid);
    let contextText = '';
    const sources: { title: string; uri: string }[] = [];
    let contextDocs: any[] = [];
    
    try {
        // Fetch a larger pool of recent documents (up to 25) to create a better context for the AI to search within.
        const maxDocs = 25;
        if (scope === 'Course') {
            const materialsQuery = query(collection(userDocRef, 'materials'), orderBy('createdAt', 'desc'), limit(maxDocs));
            const querySnapshot = await getDocs(materialsQuery);
            contextDocs = querySnapshot.docs.map(doc => doc.data() as Material);
        } else if (scope === 'My Notes') {
            const notesQuery = query(collection(userDocRef, 'notes'), orderBy('createdAt', 'desc'), limit(maxDocs));
            const querySnapshot = await getDocs(notesQuery);
            contextDocs = querySnapshot.docs.map(doc => doc.data() as Note);
        }

        contextDocs.forEach(doc => {
            const title = (doc as Material).name || (doc as Note).title;
            const content = (doc as Material).content || (doc as Note).content || '';
            const url = (doc as Material).url || '#';
            
            contextText += `--- START OF DOCUMENT: "${title}" ---\n${content || 'No text content available.'}\n--- END OF DOCUMENT ---\n\n`;
            sources.push({ title, uri: url });
        });
        
        if (contextDocs.length === 0) {
            return {
                text: `I couldn't find any materials in the scope "${scope}" to answer your question. Please add some notes or materials first.`,
                sources: []
            };
        }

        // This new, more sophisticated prompt instructs the model to perform "in-context" retrieval.
        // It's a two-step process in one call: first find the relevant info, then answer based on it.
        const prompt = `You are an expert Q&A system performing a task called Retrieval-Augmented Generation. Your task is to answer the user's question based *only* on the provided documents.

Follow these steps carefully:
1.  First, read all the provided documents to understand their content.
2.  Identify which documents are directly relevant to answering the user's question.
3.  Synthesize a concise answer using exclusively the information from the relevant documents. Do not use any outside knowledge or make assumptions.
4.  If the answer cannot be found in the documents, state clearly: "I could not find an answer in the provided materials."

Here is the user's question and the documents:

QUESTION:
"${queryText}"

DOCUMENTS:
${contextText}

ANSWER:`;

        const response = await retryWithBackoff(async () => {
          return await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });
        });

        return {
            text: response.text,
            sources: sources, // Return all documents that were provided as potential sources.
        };

    } catch (error: any) {
        console.error(`Error fetching context or calling Gemini for scope ${scope}:`, error);
        
        // Provide specific error message for overload errors
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
          return { 
            text: "The AI service is experiencing high demand right now. I've tried multiple times but couldn't connect. Please wait a moment and try asking again.", 
            sources: [] 
          };
        }
        
        return { text: 'Sorry, I had trouble finding your materials or generating an answer. Please try again.', sources: [] };
    }
  },

  // Generates a summary from the content of selected materials.
  summarize: async (materialIds: string[], format: 'paragraph' | 'bullets' | 'flashcards', user: User): Promise<string> => {
    if (!ai) {
      throw new Error("Gemini AI client is not initialized. API_KEY may be missing.");
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
            return "The selected materials do not contain any text content to summarize. This feature currently only supports text-based materials.";
        }
        
        let formatInstruction = '';
        switch(format) {
            case 'bullets':
                formatInstruction = 'Generate a summary as a concise list of the most important key takeaways, using bullet points (*). Start with a title like "### Key Takeaways".';
                break;
            case 'flashcards':
                formatInstruction = 'Generate a summary in a flashcard format. For each key concept, provide a term followed by "///" and then its definition. Separate each flashcard with "---".';
                break;
            case 'paragraph':
            default:
                formatInstruction = 'Generate a summary as a well-written, coherent paragraph. Start with a title like "### Summary".';
                break;
        }

        const prompt = `You are an expert academic summarizer. Your task is to read the following documents and generate a summary based on the requested format.

DOCUMENTS:
${contextText}

INSTRUCTION:
${formatInstruction}

SUMMARY:`;

        const response = await retryWithBackoff(async () => {
          return await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: prompt,
              config: {
                  thinkingConfig: { thinkingBudget: 32768 },
              }
          });
        });

        return response.text;

    } catch (error: any) {
        console.error("Error generating summary with AI:", error);
        
        // Provide specific error message for overload errors
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
          throw new Error("The AI service is experiencing high demand. I've tried multiple times but couldn't connect. Please wait a moment and try again.");
        }
        
        throw new Error("Failed to generate AI summary. Please check the content of your materials and try again.");
    }
  },

  // Generates an interactive assessment/quiz using Gemini AI
  generateAssessment: async (topic: string, numQuestions: number): Promise<AssessmentQuiz> => {
    if (!ai) {
      throw new Error("Gemini AI client is not initialized. API_KEY may be missing.");
    }
    console.log(`[AI] Generating assessment for topic: "${topic}" with ${numQuestions} questions.`);

    const schema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      },
      required: ['topic', 'questions']
    };

    try {
      const prompt = `Generate a quiz with exactly ${numQuestions} multiple-choice questions on the topic "${topic}". Each question must have exactly 4 options. For each question, provide the question text, an array of 4 options, the correct answer text (which must be one of the options), and a brief explanation for the correct answer. The overall topic of the quiz should be a slightly more formal version of "${topic}".`;

      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingBudget: 32768 },
          },
        });
      });

      const quizData = JSON.parse(response.text);
      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error("AI returned an invalid quiz structure.");
      }
      return quizData as AssessmentQuiz;

    } catch (error: any) {
      console.error("Error generating assessment with AI:", error);
      
      // Provide specific error message for overload errors
      if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
        throw new Error("The AI service is experiencing high demand. I've tried multiple times but couldn't generate the quiz. Please wait a moment and try again.");
      }
      
      throw new Error("Failed to generate AI assessment. The model may have returned an unexpected response.");
    }
  },
  
  // Generates a study plan using Gemini AI
  generatePlan: async (topic: string, duration: number): Promise<PlanTask[]> => {
    if (!ai) {
      const errorMsg = !API_KEY 
        ? "AI Tutor is not configured. The required API Key is missing from the environment settings."
        : !isValidApiKey
          ? `Invalid API Key format. Please check your VITE_GEMINI_API_KEY in the .env file.`
          : "Failed to initialize Gemini AI client. Please check your network connection and API key.";
      
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    console.log(`[AI] Generating a ${duration}-day plan for topic: "${topic}"`);

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          duration: { type: Type.STRING },
        },
        required: ['day', 'title', 'description', 'duration']
      }
    };

    try {
      const prompt = `Create a detailed, day-by-day study plan for learning "${topic}" over a period of ${duration} days. For each day, provide at least one or two distinct tasks. Each task should have a clear title, a brief description of what to do, and a suggested duration (e.g., "60 minutes", "2 hours"). The plan should be structured as a JSON array of task objects.`;
      
      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingBudget: 32768 },
          },
        });
      });

      const planData = JSON.parse(response.text);
      if (!Array.isArray(planData) || planData.length === 0) {
        throw new Error("AI returned an invalid plan structure.");
      }
      return planData as PlanTask[];

    } catch (error: any) {
      console.error("Error generating plan with AI:", error);
      
      // Provide specific error message for overload errors
      if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
        throw new Error("The AI service is experiencing high demand. I've tried multiple times but couldn't generate the plan. Please wait a moment and try again.");
      }
      
      throw new Error("Failed to generate AI plan. The model may have returned an unexpected response.");
    }
  },

  // Simulates file ingestion for RAG
  ingestFile: async (materialId: string, user: User): Promise<{ success: boolean; message: string }> => {
    console.log(`[MOCK] Ingesting material ID "${materialId}" for user ${user.uid} into vector DB.`);
    // Simulate a longer delay for embedding and indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
    return {
        success: true,
        message: `Material ${materialId} has been successfully processed and is now available for Q&A.`
    }
  }
};