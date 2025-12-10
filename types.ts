import type { Timestamp } from 'firebase/firestore';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  coverImage: string;
  url: string; // URL for the external course page
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Material {
  id:string;
  courseId: string;
  name: string;
  url: string;
  type: 'pdf' | 'video' | 'link' | 'text' | 'document'; // Added 'document' type for file uploads
  createdAt: Date | Timestamp;
  aiStatus?: 'ready' | 'indexing' | 'not_indexed';
  content?: string; // For text-based materials
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  courseId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date | Timestamp;
  audioUrl?: string;
  courseId?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    sources?: { title: string; uri: string }[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AssessmentQuiz {
  topic: string;
  questions: QuizQuestion[];
}

export interface PlanTask {
    day: number;
    title: string;
    description: string;
    duration: string; // e.g., "60 minutes"
}