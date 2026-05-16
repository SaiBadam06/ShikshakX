import type { Timestamp } from 'firebase/firestore';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  coverImage: string;
  url: string; // URL for the external course page
  source?: 'seeded' | 'user';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Material {
  id:string;
  courseId: string;
  folderId?: string;
  name: string;
  url: string;
  type: 'pdf' | 'video' | 'link' | 'text' | 'document'; // Added 'document' type for file uploads
  createdAt: Date | Timestamp;
  aiStatus?: 'ready' | 'indexing' | 'not_indexed';
  content?: string; // For text-based materials
}

export interface MaterialFolder {
  id: string;
  name: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date | Timestamp | null;
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
    createdAt?: Date | Timestamp;
    mode?: 'rag' | 'ai_tutor';
    scope?: string;
    relatedQuestion?: string;
    canSaveToNotes?: boolean;
    planTasks?: PlanTask[];
    sessionId?: string;
    sessionTitle?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: 'rag' | 'ai_tutor';
  scope: string;
  updatedAt?: Date | Timestamp;
  preview: string;
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

export interface QuizAttempt {
  id: string;
  topic: string;
  score: number;
  totalQuestions: number;
  answers: string[];
  questions: QuizQuestion[];
  createdAt: Date | Timestamp;
}

export interface AppUserProfile {
  id: string;
  displayName: string;
  email: string;
  lowerEmail: string;
  photoURL?: string;
  age?: number | null;
  gender?: string;
  skills?: string[];
  headline?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhotoURL?: string;
  recipientId: string;
  createdAt: Date | Timestamp;
}

export interface FriendConnection {
  id: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendPhotoURL?: string;
  directCommunityId: string;
  createdAt: Date | Timestamp;
}

export interface CommunityRoom {
  id: string;
  name: string;
  description: string;
  type: 'group' | 'direct' | 'public';
  ownerId?: string;
  ownerName?: string;
  memberIds?: string[];
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  photoURL?: string;
}

export interface CommunityMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date | Timestamp;
}

export interface PlanTask {
    day: number;
    title: string;
    description: string;
    duration: string; // e.g., "60 minutes"
}
