// Configuration for the local Ollama model
const OLLAMA_API_URL = 'http://localhost:11434/api/chat';
const MODEL_NAME = 'llama3.2';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const getLocalAiResponse = async (prompt: string, history: { role: string, parts: { text: string }[] }[]): Promise<string> => {
  try {
    // Convert history to Ollama's format
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are 'ShikshakX AI Tutor', a friendly and encouraging AI assistant for students. 
        Your goal is to explain complex topics simply, help with homework, and foster a love for learning. 
        Never break character. Be supportive and educational.`
      },
      ...history.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' as const : 'user' as const,
        content: msg.parts[0].text
      })),
      { role: 'user', content: prompt }
    ];

    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error('Error calling local Ollama API:', error);
    throw error;
  }
};
