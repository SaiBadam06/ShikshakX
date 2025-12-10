// This service handles text embeddings
// For now, using a simple function to generate 512-dimensional vectors
// In a production environment, you would use a proper embedding model
export const getEmbeddings = async (text: string): Promise<number[]> => {
  try {
    // Simple hash function to generate consistent embeddings for the same text
    const hash = text.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    // Generate a 512-dimensional vector based on the hash
    const vector = Array(512).fill(0).map((_, i) => {
      // Simple pseudo-random number generator based on hash and index
      const rand = Math.sin(hash + i) * 10000;
      return rand - Math.floor(rand); // Normalize to [0, 1)
    });
    
    return vector;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    // Return a zero vector if embedding fails (512 dimensions)
    return new Array(512).fill(0);
  }
};

// Split text into chunks for better embedding
export const chunkText = (text: string, chunkSize = 1000, overlap = 200): string[] => {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    
    // Try to find a good breaking point (end of sentence)
    const lastPeriod = text.lastIndexOf('.', end);
    const lastSpace = text.lastIndexOf(' ', end);
    
    if (lastPeriod > start + chunkSize * 0.5) {
      end = lastPeriod + 1;
    } else if (lastSpace > start + chunkSize * 0.8) {
      end = lastSpace;
    }
    
    chunks.push(text.slice(start, end).trim());
    start = Math.max(start + chunkSize - overlap, end); // Overlap chunks
  }
  
  return chunks;
};
