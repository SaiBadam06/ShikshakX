import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const hasConfiguredValue = (value?: string) =>
  Boolean(value && !/^your_|^replace_|placeholder/i.test(value));

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => hasConfiguredValue(value));

// Initialize Firebase
let app;

let auth;
let db;
let storage;
let googleProvider;
try {
  if (!isFirebaseConfigured) {
    console.warn('Firebase is not fully configured. Authentication and database features will remain unavailable until the environment variables are set.');
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser doesn\'t support offline persistence.');
    }
  });
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase services');
}
// Add scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set persistence
const initAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("Auth persistence set to LOCAL");
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
};
// Initialize auth persistence
initAuthPersistence();
// Export the services and auth utilities for easy access
export { 
  app, 
  auth, 
  db, 
  storage,
  firebaseConfig, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut as signOut,
  GoogleAuthProvider
};
