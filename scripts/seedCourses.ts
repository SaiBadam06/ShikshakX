import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

// Sample courses data with all required fields for CourseCard
const sampleCourses = [
  {
    title: 'Mathematics',
    description: 'Advanced mathematics including algebra, calculus, and geometry',
    instructor: 'Dr. Sarah Johnson',
    coverImage: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80',
    url: '#',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    color: '#3B82F6' // blue-500
  },
  {
    title: 'Physics',
    description: 'Fundamentals of physics and modern physics',
    instructor: 'Prof. Robert Chen',
    coverImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    url: '#',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    color: '#10B981' // emerald-500
  },
  {
    title: 'Computer Science',
    description: 'Programming, algorithms, and data structures',
    instructor: 'Dr. Emily Zhang',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    url: '#',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    color: '#8B5CF6' // violet-500
  },
  {
    title: 'Literature',
    description: 'Classic and contemporary literature',
    instructor: 'Prof. James Wilson',
    coverImage: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80',
    url: '#',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    color: '#EC4899' // pink-500
  },
  {
    title: 'History',
    description: 'World history and civilizations',
    instructor: 'Dr. Maria Garcia',
    coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1422&q=80',
    url: '#',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    color: '#F59E0B' // amber-500
  }
];

// Function to seed courses
const seedCourses = async (userId: string) => {
  try {
    const coursesCollection = collection(db, 'users', userId, 'courses');
    
    // Add each course to Firestore
    const promises = sampleCourses.map(course => 
      addDoc(coursesCollection, course)
    );
    
    await Promise.all(promises);
    console.log('Successfully added sample courses!');
  } catch (error) {
    console.error('Error seeding courses:', error);
  }
};

// Get user credentials from environment variables or prompt
const email = process.env.FIREBASE_ADMIN_EMAIL;
const password = process.env.FIREBASE_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Please set FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD environment variables');
  process.exit(1);
}

// Sign in and seed courses
const runSeed = async () => {
  try {
    // Sign in the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    console.log(`Signed in as ${userCredential.user.email}`);
    
    // Seed courses
    await seedCourses(userId);
    
    console.log('Done! You can now check your Firestore database for the sample courses.');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

runSeed();
