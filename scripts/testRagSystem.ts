import 'dotenv/config';
import { upsertContent, searchRelevantContent, verifyPineconeSetup } from '../services/vectorDbService';

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  PINECONE_API_KEY: process.env.VITE_PINECONE_API_KEY ? '***' + process.env.VITE_PINECONE_API_KEY.slice(-4) : 'Not found'
});

async function testRagSystem() {
  console.log('🚀 Testing RAG System...');
  
  // 1. Verify Pinecone connection
  console.log('\n🔍 Verifying Pinecone connection...');
  const connection = await verifyPineconeSetup();
  console.log('Pinecone Connection Status:', connection.connected ? '✅ Connected' : '❌ Failed');
  if (!connection.connected) {
    console.error('Failed to connect to Pinecone:', connection.error);
    return;
  }

  // 2. Add test data
  console.log('\n📝 Adding test data...');
  const testUserId = 'test_user_1';
  const currentTime = Date.now();
  const testCourse = {
    userId: testUserId,
    type: 'course' as const,
    content: 'Introduction to Machine Learning: Machine learning is a method of data analysis that automates analytical model building.',
    metadata: {
      courseId: 'ml101',
      subject: 'Computer Science',
      topic: 'Machine Learning',
      difficulty: 'beginner' as const,
      tags: ['ml', 'ai', 'beginner'],
      timestamp: currentTime
    }
  };

  const testNote = {
    userId: testUserId,
    type: 'note' as const,
    content: 'Important formula: y = mx + b is the equation of a line',
    metadata: {
      courseId: 'math101',
      subject: 'Mathematics',
      topic: 'Linear Equations',
      difficulty: 'beginner' as const,
      timestamp: currentTime,
      tags: ['math', 'formula']
    }
  };

  try {
    const [courseId, noteId] = await Promise.all([
      upsertContent(testCourse),
      upsertContent(testNote)
    ]);
    
    console.log('✅ Test data added successfully!');
    console.log(`- Course ID: ${courseId[0]}...`);
    console.log(`- Note ID: ${noteId[0]}...`);

    // Wait a moment for indexing
    console.log('\n⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Test search
    console.log('\n🔎 Testing search functionality...');
    const searchQuery = 'What is machine learning?';
    console.log(`Searching for: "${searchQuery}"`);
    
    const results = await searchRelevantContent(testUserId, searchQuery, { limit: 3 });
    
    console.log('\n📊 Search Results:');
    results.forEach((result, index) => {
      const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      console.log(`\nResult ${index + 1} (Score: ${result.score?.toFixed(3)})`);
      console.log(`Type: ${result.metadata.type}`);
      console.log(`Content: ${content.substring(0, 100)}...`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testRagSystem().catch(console.error);
