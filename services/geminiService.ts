import { groq, GROQ_MODEL, retryWithBackoff } from './groqService';
import { getFallbackResponse } from './fallbackAiService';

if (!groq) {
  console.warn('Groq API Key is not set in the environment. AI Tutor will not function.');
}

// Main function to get AI Tutor response using Groq
export const generateAiTutorResponse = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  if (!groq) {
    return getFallbackResponse(prompt);
  }

  try {
    // Convert history to Groq message format
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `You are 'ShikshakX AI Tutor', an academic assistant exclusively designed for education, learning, and research.

Your ONLY purpose is to help with:
- Academic subjects (science, math, history, literature, engineering, medicine, law, arts, etc.)
- Research and study questions
- Explaining concepts, theories, and academic topics
- Study tips and learning strategies
- Homework and assignment help
- Career guidance related to education fields

If a user asks about anything unrelated to education or research (e.g., entertainment, personal advice, politics, social media, etc.), politely decline and redirect them. Example response for off-topic questions: "I'm ShikshakX AI Tutor and I'm only able to help with academic, educational, and research-related questions. Could you ask me something about a subject you're studying?"

Always respond in well-formatted markdown for clarity. Use headers, bullet points, and bold text where appropriate.`
      }

    ];

    // Add conversation history
    for (const h of history) {
      messages.push({
        role: h.role === 'bot' || h.role === 'model' ? 'assistant' : 'user',
        content: h.parts.map(p => p.text).join('')
      });
    }

    // Add the current user message
    messages.push({ role: 'user', content: prompt });

    const response = await retryWithBackoff(() =>
      groq!.chat.completions.create({
        model: GROQ_MODEL,
        messages,
      })
    );

    return response.choices[0]?.message?.content || getFallbackResponse(prompt);
  } catch (error) {
    console.error('Error in generateAiTutorResponse using Groq:', error);
    return getFallbackResponse(prompt);
  }
};