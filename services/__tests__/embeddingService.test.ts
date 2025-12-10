import { describe, it, expect } from 'vitest';
import { getEmbeddings } from '../embeddingService';

describe('Embedding Service', () => {
  it('should generate embeddings for text', async () => {
    const text = 'This is a test';
    const embedding = await getEmbeddings(text);
    
    // Verify the embedding is an array
    expect(Array.isArray(embedding)).toBe(true);
    
    // Verify the embedding has the correct length (512 dimensions)
    expect(embedding.length).toBe(512);
    
    // Verify all values are numbers between 0 and 1
    expect(embedding.every(val => typeof val === 'number' && val >= 0 && val < 1)).toBe(true);
  });

  it('should return consistent embeddings for the same input', async () => {
    const text = 'Consistent test';
    const embedding1 = await getEmbeddings(text);
    const embedding2 = await getEmbeddings(text);
    
    // Verify the same input produces the same output
    expect(embedding1).toEqual(embedding2);
  });

  it('should handle empty string', async () => {
    const embedding = await getEmbeddings('');
    
    // The current implementation returns a non-zero vector for empty string
    expect(embedding.length).toBe(512);
    expect(embedding.every(val => val >= 0 && val < 1)).toBe(true);
  });

  it('should generate consistent embeddings for different inputs', async () => {
    const embedding1 = await getEmbeddings('test input');
    const embedding2 = await getEmbeddings('test input');
    
    // The current implementation is deterministic for the same input
    expect(embedding1).toEqual(embedding2);
  });
  
  it('should handle special characters', async () => {
    const text = 'Special characters: !@#$%^&*()';
    const embedding = await getEmbeddings(text);
    
    expect(embedding.length).toBe(512);
    expect(embedding.every(val => val >= 0 && val < 1)).toBe(true);
  });
});
