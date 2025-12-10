import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbeddings, chunkText } from './embeddingService';

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.VITE_PINECONE_API_KEY || '',
  // The environment is now part of the index configuration in the Pinecone console
});

// Using the existing index from the Pinecone console
const INDEX_NAME = 'my-ai-memory';

// The base URL for your Pinecone index
// This is the host from the test output
const BASE_URL = 'my-ai-memory-zleywjm.svc.aped-4627-b74a.pinecone.io';

// Get the Pinecone index
const getPineconeIndex = async () => {
  try {
    // In the free tier, we'll use the default index
    const index = pc.index(INDEX_NAME);
    return index;
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    throw error;
  }
};

// Types for our knowledge base
type ContentType = 'course' | 'note' | 'assessment' | 'feedback';

interface KnowledgeBaseItem {
  id: string;
  userId: string;
  type: ContentType;
  content: string;
  metadata: {
    courseId?: string;
    subject?: string;
    topic?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    timestamp: number;
    score?: number; // For assessments
    tags?: string[];
  };
}

// Add or update content in the knowledge base
export const upsertContent = async (content: Omit<KnowledgeBaseItem, 'id' | 'timestamp'>) => {
  try {
    const index = await getPineconeIndex();
    const chunks = chunkText(content.content);
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbeddings(chunk);
      
      // Ensure the embedding is an array of numbers
      const embeddingValues = Array.isArray(embedding) ? embedding : [];
      
      // Ensure the vector has exactly 512 dimensions
      const paddedEmbedding = [...embeddingValues].concat(Array(Math.max(0, 512 - embeddingValues.length)).fill(0)).slice(0, 512);
      
      vectors.push({
        id: `item_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        values: paddedEmbedding,
        metadata: {
          ...content.metadata,
          userId: content.userId,
          type: content.type,
          content: chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
          timestamp: Date.now(),
        },
      });
    }
    
    await index.upsert(vectors);
    return vectors.map(v => v.id);
  } catch (error) {
    console.error('Error upserting content:', error);
    throw error;
  }
};

// Retrieve relevant content based on query
export const searchRelevantContent = async (
  userId: string,
  query: string,
  options: {
    limit?: number;
    type?: ContentType;
    courseId?: string;
    minScore?: number;
  } = {}
) => {
  try {
    const index = await getPineconeIndex();
    const queryEmbedding = await getEmbeddings(query);
    
    const filter: any = { userId };
    if (options.type) filter.type = options.type;
    if (options.courseId) filter.courseId = options.courseId;
    
    const results = await index.query({
      vector: queryEmbedding,
      topK: options.limit || 5,
      filter,
      includeMetadata: true,
    });
    
    // Filter by minimum score if provided
    const minScore = options.minScore || 0.7;
    return results.matches
      .filter(match => match.score && match.score >= minScore)
      .map(match => ({
        id: match.id,
        score: match.score,
        content: match.metadata?.content || '',
        metadata: {
          type: match.metadata?.type as ContentType,
          ...match.metadata
        }
      }));
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
};

// Verify Pinecone connection and index
export const verifyPineconeSetup = async () => {
  try {
    const index = await getPineconeIndex();
    // Try to get index stats to verify connection
    await index.describeIndexStats();
    return { connected: true };
  } catch (error) {
    console.error('Pinecone connection failed:', error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
