import { collection, getDocs, writeBatch, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Course, Material, Note } from '../types';
import { DUMMY_COURSES, getDummyData } from './dummyData';

// By incrementing this version, we can force a re-seed for all users on the next app load.
const SEED_VERSION = '4.1'; // Data extracted to separate file.
const seedInFlight = new Map<string, Promise<void>>();

export const seedInitialData = async (userId: string) => {
  if (!userId) {
    console.error("Cannot seed data without a user ID.");
    return;
  }

  if (seedInFlight.has(userId)) {
    return seedInFlight.get(userId);
  }
  
  const seedPromise = (async () => {
    const userDocRef = doc(db, 'users', userId);
    const metaRef = doc(userDocRef, 'meta', 'seedStatus');
    const metaSnap = await getDoc(metaRef);

    if (metaSnap.exists()) {
      console.log(`User ${userId} already has seeded data. Skipping duplicate seed.`);
      return;
    }
    
    console.log(`Seeding initial data for new user: ${userId} (Version: ${SEED_VERSION})`);
    
    const seedBatch = writeBatch(db);

    // Seed Courses and get their IDs
    const courseRefs = DUMMY_COURSES.map(() => doc(collection(userDocRef, 'courses')));
    const courseIds: { [key: string]: string } = {};
    courseRefs.forEach((ref, index) => {
      const courseTitle = DUMMY_COURSES[index].title;
      seedBatch.set(ref, DUMMY_COURSES[index]);
      courseIds[courseTitle] = ref.id;
    });
    
    const { materials, notes } = getDummyData(courseIds);

    materials.forEach(material => {
      const docRef = doc(collection(userDocRef, 'materials'));
      seedBatch.set(docRef, material);
    });

    notes.forEach(note => {
      const docRef = doc(collection(userDocRef, 'notes'));
      seedBatch.set(docRef, note);
    });

    seedBatch.set(metaRef, { version: SEED_VERSION, seededAt: Timestamp.now() });

    await seedBatch.commit();
    console.log(`Initial data for user ${userId} seeded successfully.`);
  })();

  seedInFlight.set(userId, seedPromise);

  try {
    await seedPromise;
  } finally {
    seedInFlight.delete(userId);
  }
};
