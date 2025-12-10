import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Sample tasks data
const sampleTasks = [
  {
    title: 'Complete Math Assignment',
    description: 'Finish the calculus problems on integration',
    dueDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
    completed: false,
    courseId: 'math-course-id',
    createdAt: serverTimestamp()
  },
  {
    title: 'Read Physics Chapter 5',
    description: 'Read about thermodynamics and solve practice problems',
    dueDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
    completed: false,
    courseId: 'physics-course-id',
    createdAt: serverTimestamp()
  },
  {
    title: 'Submit Literature Essay',
    description: 'Submit the final draft of the essay on Shakespeare',
    dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
    completed: false,
    courseId: 'literature-course-id',
    createdAt: serverTimestamp()
  }
];

// Function to seed tasks
const seedTasks = async (userId: string) => {
  try {
    const tasksCollection = collection(db, 'users', userId, 'tasks');
    
    // Add each task to Firestore
    const promises = sampleTasks.map(task => 
      addDoc(tasksCollection, task)
    );
    
    await Promise.all(promises);
    console.log('Successfully added sample tasks!');
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};

// Get user credentials from environment variables or prompt
const email = process.env.FIREBASE_ADMIN_EMAIL;
const password = process.env.FIREBASE_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Please set FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD environment variables');
  process.exit(1);
}

// Sign in and seed tasks
const runSeed = async () => {
  try {
    // Sign in the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    console.log(`Signed in as ${userCredential.user.email}`);
    
    // Seed tasks
    await seedTasks(userId);
    
    console.log('Done! You can now check your Firestore database for the sample tasks.');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

runSeed();
