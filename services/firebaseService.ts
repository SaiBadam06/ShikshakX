import { collection, getDocs, writeBatch, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Course, Material, Task, Note } from '../types';
import { DUMMY_COURSES, getDummyData } from './dummyData';

// By incrementing this version, we can force a re-seed for all users on the next app load.
const SEED_VERSION = '4.1'; // Data extracted to separate file.

export const seedInitialData = async (userId: string) => {
  if (!userId) {
    console.error("Cannot seed data without a user ID.");
    return;
  }
  
  const userDocRef = doc(db, 'users', userId);
  const metaRef = doc(userDocRef, 'meta', 'seedStatus');
  const metaSnap = await getDoc(metaRef);

  if (metaSnap.exists() && metaSnap.data().version === SEED_VERSION) {
    console.log(`User ${userId} already has seeded data version ${SEED_VERSION}. Skipping.`);
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
  
  const { materials, tasks, notes } = getDummyData(courseIds);

  // Seed Materials
  materials.forEach(material => {
    const docRef = doc(collection(userDocRef, 'materials'));
    seedBatch.set(docRef, material);
  });

  // Seed Tasks
  tasks.forEach(task => {
    const docRef = doc(collection(userDocRef, 'tasks'));
    seedBatch.set(docRef, task);
  });

  // Seed Notes
  notes.forEach(note => {
    const docRef = doc(collection(userDocRef, 'notes'));
    seedBatch.set(docRef, note);
  });

  // After seeding, set the version flag for this user
  seedBatch.set(metaRef, { version: SEED_VERSION, seededAt: Timestamp.now() });

  await seedBatch.commit();
  console.log(`Initial data for user ${userId} seeded successfully.`);
};