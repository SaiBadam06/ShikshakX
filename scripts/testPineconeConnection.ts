import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current module's directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function testPineconeConnection() {
  console.log('🚀 Testing Pinecone Connection...');
  
  try {
    // Get API key from environment variables
    const apiKey = process.env.VITE_PINECONE_API_KEY;
    console.log('Using API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not found');
    
    if (!apiKey) {
      throw new Error('Pinecone API key not found in environment variables');
    }
    
    // Initialize Pinecone client
    const pc = new Pinecone({
      apiKey: apiKey
    });

    console.log('✅ Pinecone client initialized successfully');
    
    // List all indexes
    console.log('📋 Listing all indexes...');
    const indexes = await pc.listIndexes();
    console.log('Available indexes:', indexes);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error testing Pinecone connection:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Run the test
testPineconeConnection()
  .then(result => {
    console.log('\nTest completed:', result.success ? '✅ Success' : '❌ Failed');
    if (!result.success) {
      console.error('Error:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
