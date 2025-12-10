// Simple in-memory fallback responses for common educational queries
const FALLBACK_RESPONSES: Record<string, string> = {
  'hello': "Hello! I'm your AI tutor. I'm currently experiencing high demand, but I'm here to help! What would you like to learn about?",
  'help': "I can help with various educational topics. Try asking me questions about math, science, history, or any subject you're studying!",
  'math': "I can help with math problems! Try asking something specific like 'How do I solve quadratic equations?' or 'Explain the Pythagorean theorem'.",
  'science': "Science is fascinating! I can help with physics, chemistry, biology, and more. What specific topic interests you?",
  'history': "I'd be happy to help with history! Let me know which period or event you're interested in learning about.",
  'default': "I'm currently experiencing high demand, but I still want to help! Could you try rephrasing your question or ask about a different topic?"
};

export const getFallbackResponse = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for specific keywords in the prompt
  if (lowerPrompt.includes('math') || lowerPrompt.includes('calculate')) {
    return FALLBACK_RESPONSES['math'];
  } else if (lowerPrompt.includes('science') || lowerPrompt.includes('physics') || 
             lowerPrompt.includes('chemistry') || lowerPrompt.includes('biology')) {
    return FALLBACK_RESPONSES['science'];
  } else if (lowerPrompt.includes('history') || lowerPrompt.includes('war') || 
             lowerPrompt.includes('century') || lowerPrompt.includes('ancient')) {
    return FALLBACK_RESPONSES['history'];
  } else if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
    return FALLBACK_RESPONSES['hello'];
  } else if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do')) {
    return FALLBACK_RESPONSES['help'];
  }
  
  // Default response for anything else
  return FALLBACK_RESPONSES['default'];
};
