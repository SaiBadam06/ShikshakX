# RAG (Retrieval-Augmented Generation) Implementation Guide

## Overview
This document explains how the RAG model is implemented in the ShikshakX application and provides guidance on monitoring its learning progress.

## Setup and Running Instructions

### Prerequisites
- Node.js (v18 or later)
- Ollama installed and running
- Pinecone account and API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_PINECONE_API_KEY=your_pinecone_api_key
VITE_PINECONE_ENVIRONMENT=gcp-starter
# Other environment variables as needed
```

### 3. Start Ollama Server
In a separate terminal, run:
```bash
ollama serve
```

### 4. Pull Required Models
```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 5. Start the Development Server
```bash
npm run dev
```

### 6. Run Tests
```bash
# Test RAG system
npm run test:rag

# Test Pinecone connection
npm run test:pinecone
```

### 7. Access the Application
Open your browser and navigate to:
```
http://localhost:5173  # or the port shown in your terminal
```

### Running in Production
For production deployment, build the application with:
```bash
npm run build
npm run preview
```

## How RAG Works in ShikshakX

### 1. Architecture

```
[User Input] → [Query Processing] → [Retrieval] → [Generation] → [Response]
                    |                    |
                    v                    v
              [Query Analysis]   [Vector Database]
                                      |
                                      v
                              [Knowledge Base]
```

### 2. Components

#### a) Retrieval Component
- **Vector Database**: Stores document embeddings for efficient similarity search
- **Embedding Model**: Converts text into vector representations
- **Query Processing**: Analyzes and processes user queries for better retrieval

#### b) Generation Component
- **LLM (Gemini 2.5 Pro)**: Generates responses based on retrieved context
- **Prompt Engineering**: Structures the input to the LLM for optimal responses
- **Context Integration**: Combines retrieved information with the user's query

### 3. Data Flow

1. **Ingestion**
   - Documents are processed and split into chunks
   - Each chunk is converted to a vector embedding
   - Vectors are stored in the vector database with metadata

2. **Querying**
   - User query is converted to a vector
   - Similar vectors are retrieved from the database
   - Top-k most relevant chunks are selected as context

3. **Generation**
   - Retrieved context is combined with the user query
   - The LLM generates a response using this enriched context
   - Response is formatted and returned to the user

## Monitoring RAG Learning

### 1. Performance Metrics

#### a) Retrieval Metrics
- **Hit Rate**: Percentage of queries where relevant context was found
- **Mean Reciprocal Rank (MRR)**: Quality of the ranking of retrieved documents
- **Recall@K**: Percentage of relevant documents in top K results

#### b) Generation Metrics
- **Perplexity**: How well the model predicts the next word (lower is better)
- **BLEU Score**: Compares generated text to reference text
- **Human Evaluation Scores**: Quality ratings from users

### 2. Implementation-Specific Monitoring

#### a) Logging
```typescript
// Example logging implementation
const logRetrieval = (query: string, results: any[], scores: number[]) => {
  console.log({
    type: 'retrieval',
    timestamp: new Date().toISOString(),
    query,
    resultCount: results.length,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    topScore: Math.max(...scores)
  });
};
```

#### b) Dashboard Metrics
1. **Retrieval Performance**
   - Average similarity scores
   - Query success rate
   - Response time percentiles

2. **Generation Quality**
   - Response length distribution
   - Token usage
   - Error rates

### 3. Testing RAG Learning

#### a) Test Queries
```typescript
const testQueries = [
  { query: "Explain quantum computing", expectedTopics: ["quantum", "superposition", "qubit"] },
  { query: "How does photosynthesis work?", expectedTopics: ["plants", "chlorophyll", "sunlight"] }
];
```

#### b) Evaluation Script
```bash
# Run evaluation tests
npm run test:rag -- --coverage
```

## Troubleshooting

### Common Issues
1. **Poor Retrieval**
   - Check if documents are properly embedded
   - Verify vector similarity thresholds
   - Review document chunking strategy

2. **Irrelevant Responses**
   - Check prompt engineering
   - Verify context window size
   - Review retrieved chunks for relevance

3. **Performance Issues**
   - Monitor vector database performance
   - Check for optimal index usage
   - Review query optimization

## Best Practices

1. **Data Quality**
   - Clean and preprocess documents
   - Use consistent formatting
   - Regularly update the knowledge base

2. **Model Tuning**
   - Fine-tune embedding models
   - Optimize chunk sizes
   - Adjust temperature and other generation parameters

3. **Monitoring**
   - Set up alerts for anomalies
   - Track key metrics over time
   - Regularly review logs

## Next Steps
1. Implement A/B testing for different retrieval strategies
2. Add user feedback collection
3. Set up automated retraining pipeline
4. Implement continuous evaluation

---
*Last Updated: October 27, 2025*
