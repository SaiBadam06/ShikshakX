import { GoogleGenAI } from "@google/genai";
import { getFallbackResponse } from './fallbackAiService';
import { getLocalAiResponse } from './ollamaService';

// Get the API key from Vite environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  // This warning will show in the console if the API key is not provided by the environment.
  console.warn("Gemini API Key is not set in the environment. AI Tutor will not function.");
}

// Initialize GoogleGenAI with a named apiKey parameter as per guidelines.
// A null 'ai' instance is created if the key is missing, which is handled gracefully below.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Retry configuration
const MAX_RETRIES = 5; // Increased from 3 to 5
const INITIAL_RETRY_DELAY = 1500; // Increased from 1s to 1.5s
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay

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

      // Exponential backoff with jitter and max cap
      const baseDelay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, i) + Math.random() * 1000, // Add jitter
        MAX_RETRY_DELAY
      );
      console.log(`🔄 API overloaded. Retrying in ${Math.round(baseDelay)}ms... (Attempt ${i + 1}/${retries})`);
      await delay(baseDelay);
    }
  }
  throw new Error('Max retries reached');
}

// Flag to track if we should use Gemini as fallback
let useGeminiFallback = false;

// Main function to get AI response, using local model first and Gemini as fallback
export const generateAiTutorResponse = async (prompt: string, history: { role: string, parts: { text: string }[] }[]): Promise<string> => {
  try {
    // First try the local Ollama model
    if (!useGeminiFallback) {
      try {
        console.log("Trying local Ollama model...");
        const response = await getLocalAiResponse(prompt, history);
        return response;
      } catch (error) {
        console.warn("Local model failed, falling back to Gemini", error);
        useGeminiFallback = true;
      }
    }

    // If local model fails or we're set to use Gemini
    if (useGeminiFallback && ai) {
      try {
        console.log("Using Gemini as fallback...");
        const chatHistory = history.map(h => ({
          role: h.role === 'bot' ? 'model' as const : 'user' as const,
          parts: h.parts
        }));

        const contents = [...chatHistory, { role: 'user' as const, parts: [{ text: prompt }] }];
        
        const response = await retryWithBackoff(async () => {
          return await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents,
            config: {
              systemInstruction: "You are 'ShikshakX AI Tutor', a friendly and encouraging AI assistant for students.",
              thinkingConfig: { thinkingBudget: 32768 },
            },
          });
        });
        
        return response.text;
      } catch (error) {
        console.error("Gemini fallback also failed", error);
      }
    }

    // If both local model and Gemini fail, use the basic fallback
    return getFallbackResponse(prompt);
    
  } catch (error) {
    console.error("Unexpected error in generateAiTutorResponse:", error);
    return getFallbackResponse(prompt);
  }
};