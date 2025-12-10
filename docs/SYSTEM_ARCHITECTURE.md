# ShikshakX - System Architecture

**Version:** 1.0  
**Last Updated:** October 28, 2025  
**Status:** Production (MVP)

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [AI Services Layer](#4-ai-services-layer)
5. [Data Layer](#5-data-layer)
6. [Integration Points](#6-integration-points)
7. [Security Architecture](#7-security-architecture)
8. [Performance Considerations](#8-performance-considerations)
9. [Scalability](#9-scalability)
10. [Monitoring & Analytics](#10-monitoring--analytics)

## 1. Architecture Overview

ShikshakX follows a modern, cloud-native architecture with clear separation of concerns across multiple layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATIONS                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐  │
│  │  Web App    │     │ Mobile App  │     │  Admin Portal   │  │
│  │ (React/TS)  │     │ (React      │     │  (Next.js)      │  │
│  └──────┬──────┘     │  Native)    │     └────────┬────────┘  │
└─────────┼────────────┼─────────────┼───────────────┼───────────┘
          │            │             │               │
          ▼            ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Firebase Hosting & Cloud Functions                     │    │
│  └───────────────────────────────┬─────────────────────────┘    │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                      MICROSERVICES LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Auth Service│  │ Content Mgmt│  │ AI Services            │  │
│  │             │  │             │  │ • RAG Q&A              │  │
│  └─────────────┘  └─────────────┘  │ • Summarization        │  │
│                                     │ • Assessment Generation│  │
└─────────────────────────────────────┼─────────────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────┐
│                      DATA LAYER                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Firestore            │  Cloud Storage  │  Redis   │     │
│  │  • Users              │  • Study        │  • Cache  │     │
│  │  • Courses            │    Materials    │  • Rate   │     │
│  │  • Notes              │  • User         │    Limiting│     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

## 2. Frontend Architecture

### 2.1 Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   ├── Header
│   └── MainContent
│       ├── Dashboard
│       │   ├── CourseList
│       │   ├── TaskList
│       │   └── RecentActivity
│       ├── Courses
│       │   ├── CourseGrid
│       │   └── CourseDetail
│       ├── Notes
│       │   ├── NoteList
│       │   └── NoteEditor
│       └── Community
│           ├── ChatWindow
│           └── UserList
└── Auth
    ├── Login
    └── Register
```

### 2.2 State Management
- **Local State**: React hooks (useState, useReducer)
- **Global State**: React Context API + useReducer
- **Server State**: React Query for data fetching and caching
- **Form State**: React Hook Form with Zod validation

### 2.3 Key Libraries
- **UI Framework**: React 19 with TypeScript
- **Styling**: TailwindCSS + CSS Modules
- **Routing**: React Router v7
- **Form Handling**: React Hook Form
- **Data Fetching**: React Query
- **Charts**: Recharts
- **Rich Text Editor**: Tiptap
- **Date Handling**: date-fns
- **Testing**: Jest + React Testing Library

## 3. Backend Architecture

### 3.1 Firebase Cloud Functions
- **Authentication**: User signup/login flows
- **Data Processing**: Background tasks and data aggregation
- **Webhooks**: Third-party integrations
- **Scheduled Jobs**: Daily summaries, notifications

### 3.2 API Endpoints
```typescript
// Example API endpoint structure
{
  // User Management
  '/api/users': {
    GET: 'Get current user profile',
    POST: 'Create new user',
    PUT: 'Update user profile'
  },
  
  // Course Management
  '/api/courses': {
    GET: 'List all courses',
    POST: 'Create new course'
  },
  '/api/courses/:id': {
    GET: 'Get course details',
    PUT: 'Update course',
    DELETE: 'Delete course'
  },
  
  // AI Services
  '/api/ai/ask': 'AI Q&A endpoint',
  '/api/ai/summarize': 'Document summarization',
  '/api/ai/generate-quiz': 'Quiz generation'
}
```

## 4. AI Services Layer

### 4.1 RAG (Retrieval-Augmented Generation) Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Query     │    │  Document       │    │  LLM (Gemini)   │
│                 │    │  Retrieval      │    │                 │
│  "Explain       ├───►│  (Pinecone/     ├───►│  Generates      │
│  quantum        │    │   Firestore     │    │  response using │
│  computing"     │    │   Vector DB)    │    │  retrieved docs │
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                      │
                                                      ▼
┌─────────────────┐                            ┌─────────────────┐
│  Response       │                            │  Source         │
│  Generation     │◄──────────────────────────┤  Attribution    │
│                 │                           │  & Citations    │
└─────────────────┘                           └─────────────────┘
```

### 4.2 AI Model Integration
- **Primary LLM**: Google Gemini 2.5 Flash
- **Embeddings**: text-embedding-004
- **Vector Store**: Pinecone (for semantic search)
- **Audio Processing**: Google Speech-to-Text
- **Document Processing**: PDF.js, mammoth.js

## 5. Data Layer

### 5.1 Firestore Collections
```typescript
// Users Collection
{
  users: {
    userId: {
      name: string;
      email: string;
      role: 'student' | 'instructor' | 'admin';
      preferences: {
        theme: 'light' | 'dark' | 'system';
        notifications: boolean;
        // ... other preferences
      };
      createdAt: Timestamp;
      lastLogin: Timestamp;
    }
  },
  
  // Courses Subcollection
  users/{userId}/courses: {
    courseId: {
      title: string;
      description: string;
      instructor: string;
      coverImage: string;
      progress: number; // 0-100
      lastAccessed: Timestamp;
      // ... other course fields
    }
  },
  
  // Notes Subcollection
  users/{userId}/notes: {
    noteId: {
      title: string;
      content: string;
      courseId?: string; // Optional association
      tags: string[];
      createdAt: Timestamp;
      updatedAt: Timestamp;
      audioUrl?: string;
    }
  }
}
```

### 5.2 Storage Buckets
- `user-uploads/` - User-uploaded files
- `course-materials/` - Course-related documents
- `ai-cache/` - Cached AI responses

## 6. Integration Points

### 6.1 Third-Party Services
- **Authentication**: Firebase Auth (Email/Password, Google OAuth)
- **Payments**: Stripe Integration
- **Calendar**: Google Calendar API
- **Analytics**: Google Analytics 4
- **Error Tracking**: Sentry
- **Email**: SendGrid

### 6.2 Webhooks
- **Payment Processing**: Handle subscription events
- **Calendar Updates**: Sync with external calendars
- **Document Processing**: Trigger AI processing on upload

## 7. Security Architecture

### 7.1 Authentication & Authorization
- JWT-based authentication with Firebase Auth
- Role-based access control (RBAC)
- Session management with refresh tokens
- Rate limiting on sensitive endpoints

### 7.2 Data Protection
- Encryption at rest (Firestore)
- Encryption in transit (TLS 1.3)
- Field-level security rules
- Regular security audits

## 8. Performance Considerations

### 8.1 Frontend
- Code splitting with React.lazy()
- Image optimization with next/image
- Virtualized lists for large datasets
- Service workers for offline support

### 8.2 Backend
- Connection pooling for database connections
- Caching with Redis
- Asynchronous processing for long-running tasks
- Efficient database indexing

## 9. Scalability

### 9.1 Horizontal Scaling
- Stateless backend services
- Load balancing with Firebase Hosting
- Auto-scaling Cloud Functions

### 9.2 Database Scaling
- Firestore automatic scaling
- Read replicas for high-traffic queries
- Batch operations for bulk data

## 10. Monitoring & Analytics

### 10.1 Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- User session recordings

### 10.2 Business Metrics
- User engagement analytics
- Feature usage statistics
- Conversion funnels

### 10.3 Logging
- Structured logging with severity levels
- Centralized log management
- Retention policies

## Future Architecture Considerations

1. **Microservices Migration**:
   - Break down into smaller, independent services
   - Service mesh for inter-service communication
   - Event-driven architecture with Pub/Sub

2. **Multi-region Deployment**:
   - Geo-replicated database
   - Edge caching with CDN
   - Regional failover

3. **AI Model Optimization**:
   - Model quantization for faster inference
   - On-device AI capabilities
   - Custom model fine-tuning

4. **Enhanced Analytics Pipeline**:
   - Real-time analytics with Kafka
   - Data warehouse integration
   - Predictive analytics

5. **Blockchain Integration**:
   - Verifiable credentials for certifications
   - Decentralized identity
   - Smart contracts for course marketplaces
