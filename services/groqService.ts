import Groq from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.warn('Groq API Key is not set. AI features will not function.');
}

export const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true }) : null;

// Default model for all AI tasks
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const isLastRetry = i === retries - 1;
            const msg = error?.message || '';
            const isRetryable = msg.includes('503') || msg.includes('overloaded') || msg.includes('rate_limit') || error?.status === 429;

            if (!isRetryable || isLastRetry) throw error;

            const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, i);
            console.log(`🔄 Groq API rate limited. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
            await delay(delayMs);
        }
    }
    throw new Error('Max retries reached');
}
