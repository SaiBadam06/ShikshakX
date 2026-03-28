import type { Course, Material, Task, Note } from '../types';

// This file contains the initial data used to populate a new user's account.
// This data is written to Firestore ONCE when a new user signs up.
// After that, the application reads all data directly from the user's private collections in Firestore.

export const DUMMY_COURSES: Omit<Course, 'id'>[] = [
  {
    title: 'Machine Learning by Andrew Ng',
    description: 'The iconic beginner\'s course on machine learning. Free to audit on Coursera, covering foundational concepts.',
    instructor: 'Stanford / Coursera',
    coverImage: 'https://images.unsplash.com/photo-1555255707-c07969078f6a?q=80&w=2070&auto=format&fit=crop',
    url: 'https://www.coursera.org/learn/machine-learning',
  },
  {
    title: 'Database Management Systems',
    description: 'A comprehensive course covering foundational and advanced topics in database design, theory, and management.',
    instructor: 'University Content',
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1934&auto=format&fit=crop',
    url: '#',
  },
  {
    title: 'Artificial Intelligence Foundations',
    description: 'Explore the fundamental concepts of AI, including search, knowledge representation, and machine learning.',
    instructor: 'University Content',
    coverImage: 'https://images.unsplash.com/photo-1620712943543-95fc6962453a?q=80&w=2070&auto=format&fit=crop',
    url: '#',
  },
  {
    title: 'Computer Networks',
    description: 'Learn about the layers of communication, from physical links to application protocols, that power the internet.',
    instructor: 'University Content',
    coverImage: 'https://images.unsplash.com/photo-1518932945647-7a1c969f8be2?q=80&w=2070&auto=format&fit=crop',
    url: '#',
  },
  {
    title: 'Introduction to Deep Learning',
    description: 'A hands-on course from MIT on deep learning with TensorFlow, covering vision, NLP, and more.',
    instructor: 'MIT',
    coverImage: 'https://images.unsplash.com/photo-1674071425684-36e398436531?q=80&w=1925&auto=format&fit=crop',
    url: 'https://introtodeeplearning.com',
  },
  {
    title: 'Google\'s ML Crash Course',
    description: 'A fast-paced, practical introduction to machine learning with interactive visualizations and exercises.',
    instructor: 'Google',
    coverImage: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=1965&auto=format&fit=crop',
    url: 'https://developers.google.com/machine-learning/crash-course',
  },
];


export const getDummyData = (courseIds: { [key: string]: string }): { materials: Omit<Material, 'id'>[], tasks: Omit<Task, 'id'>[], notes: Omit<Note, 'id'>[] } => ({
  materials: [
    // RAG Paper
    { courseId: courseIds['Machine Learning by Andrew Ng'], name: 'Retrieval-Augmented Generation (RAG) Paper', type: 'text', url: '#', createdAt: new Date('2024-09-08T10:00:00Z'), aiStatus: 'ready', content: "Retrieval-Augmented Generation (RAG) represents a paradigm shift in how large language models access and utilize information. Traditional LLMs are limited by their training data cutoff dates and can hallucinate facts, but RAG addresses these limitations by combining the generative capabilities of LLMs with real-time information retrieval from external knowledge bases. The framework operates through a sophisticated pipeline: first, user queries are converted into vector embeddings; second, these embeddings perform semantic similarity searches against a vector database; third, the most relevant text chunks are retrieved; fourth, these chunks are injected into the LLM's context window; finally, the LLM generates a response grounded in both its training knowledge and the retrieved information." },
    // Bayes' Theorem
    { courseId: courseIds['Artificial Intelligence Foundations'], name: "Bayes' Theorem in AI", type: 'text', url: '#', createdAt: new Date('2024-09-08T11:00:00Z'), aiStatus: 'ready', content: "Bayes' theorem, also known as Bayes' rule or Bayesian reasoning, determines the probability of an event with uncertain knowledge. It relates the conditional probability and marginal probabilities of two random events. Named after British mathematician Thomas Bayes, it is fundamental to Bayesian statistics and inference. It allows updating the probability prediction of an event by observing new information. For example, if cancer corresponds to one's age, we can use Bayes' theorem to determine the probability of cancer more accurately with the help of age." },
    // DBMS Unit 1
    { courseId: courseIds['Database Management Systems'], name: 'Database System Concepts (DBMS Unit I)', type: 'text', url: '#', createdAt: new Date('2024-09-08T12:00:00Z'), aiStatus: 'ready', content: "A Database Management System (DBMS) is software that manages the collection of related data. It provides proper security measures for protecting data from unauthorized access and allows for storing and retrieving data effectively. Data Models are used to plan the structure of data. The main models are the Hierarchical Model (tree-like structure), Network Model (graph-like), Entity-Relationship Model (pictorial representation), and the Relational Model (two-dimensional tables)." },
    // DBMS Unit 2
    { courseId: courseIds['Database Management Systems'], name: 'The Relational Model (DBMS Unit II)', type: 'text', url: '#', createdAt: new Date('2024-09-08T13:00:00Z'), aiStatus: 'ready', content: "The Relational Model was proposed by E.F Codd in 1970 and models data in the form of relations or tables. A database is a collection of one or more relations. Key concepts include 'Relation schema' which specifies the name of the relation and its attributes, and 'Relation instance' which is the set of tuples (rows) at a particular time. Integrity constraints such as Domain, Key, and Foreign Key constraints are rules used to maintain the quality and consistency of information in the database." },
    // DBMS Unit 4
    { courseId: courseIds['Database Management Systems'], name: 'Transaction Management (DBMS Unit IV)', type: 'text', url: '#', createdAt: new Date('2024-09-08T14:00:00Z'), aiStatus: 'ready', content: "Transaction Management ensures that the database remains in a consistent state despite system and transaction failures. Transactions are governed by ACID properties: Atomicity (all or nothing), Consistency (maintaining integrity constraints), Isolation (concurrent transactions do not interfere), and Durability (completed transactions persist). A transaction can be in several states: Active, Partially Committed, Committed, Failed, and Aborted." },
    // Computer Networks
    { courseId: courseIds['Computer Networks'], name: 'Computer Networks Fundamentals', type: 'text', url: '#', createdAt: new Date('2024-09-08T15:00:00Z'), aiStatus: 'ready', content: "A computer network is a set of autonomous computers interconnected to exchange information. Networks are used for resource sharing, as a communication medium, and for e-commerce. Network criteria include performance (throughput and delay), reliability, and security. Physical structures are defined by the type of connection (point-to-point or multipoint) and topology (mesh, star, bus, ring). The OSI model provides a 7-layer framework for understanding network interactions: Physical, Data Link, Network, Transport, Session, Presentation, and Application layers." },
    // Original materials
    { courseId: courseIds['Machine Learning by Andrew Ng'], name: 'Andrew Ng\'s Lecture Notes', type: 'link', url: 'https://see.stanford.edu/materials/aimlcs229/cs229-notes1.pdf', createdAt: new Date('2024-09-05T10:00:00Z'), aiStatus: 'ready', content: 'These notes cover foundational machine learning concepts including linear regression, logistic regression, and supervised learning.' },
    { courseId: 'general', name: 'Unified Adaptive Learning Platform Research Paper', type: 'text', url: '#', createdAt: new Date('2024-09-07T11:00:00Z'), aiStatus: 'ready', content: 'A research paper from the journal Nature Environment & Pollution Technology. It details a unified and adaptive learning platform that uses Natural Language Processing (NLP) and Artificial Intelligence to provide intelligent and dynamic feedback to learners. The paper explores the architecture and theoretical underpinnings for such a system to create personalized learning experiences.' },
  ],
  tasks: [
    { title: 'Review Relational Model Integrity Constraints', description: 'Read through the notes for DBMS Unit II.', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), completed: false, courseId: courseIds['Database Management Systems'] },
    { title: 'Watch Lecture 1 on Linear Regression', description: 'Complete the first video module in the Coursera course.', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), completed: false, courseId: courseIds['Machine Learning by Andrew Ng'] },
    { title: 'Summarize the OSI Model Layers', description: 'Create a new note detailing each layer of the OSI model.', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), completed: false, courseId: courseIds['Computer Networks'] },
  ],
  notes: [
    { title: 'Key Takeaways from Gradient Descent', content: 'Gradient descent is an optimization algorithm used to minimize a function by iteratively moving in the direction of steepest descent. The learning rate is a critical hyperparameter that determines the step size at each iteration. If the learning rate is too small, convergence will be slow. If it is too large, the algorithm may overshoot the minimum and fail to converge.', createdAt: new Date(), courseId: courseIds['Machine Learning by Andrew Ng'] },
  ]
});