import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock any global objects or functions here
vi.mock('../services/embeddingService', () => ({
  getEmbeddings: vi.fn().mockResolvedValue(new Array(512).fill(0.1))
}));
