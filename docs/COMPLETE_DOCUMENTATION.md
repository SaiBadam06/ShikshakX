# ShikshakX - Complete Documentation Report

**Project:** ShikshakX - AI-Powered Learning Companion  
**Version:** 1.0  
**Date:** October 27, 2025  
**Status:** Production Ready (MVP)

---

## Executive Summary

ShikshakX is a comprehensive AI-powered learning companion web application that leverages cutting-edge technologies including Google's Gemini AI and Retrieval-Augmented Generation (RAG) to provide students and educators with intelligent learning assistance. The application offers features such as context-aware Q&A, automated summarization, quiz generation, study planning, and integrated task management.

### Key Statistics
- **Pages:** 10 functional pages
- **Components:** 6 reusable components
- **Services:** 6 service modules
- **AI Features:** 4 (RAG Q&A, Summarization, Assessment, Planning)
- **Database Collections:** 4 per user (courses, materials, notes, tasks)
- **Tech Stack:** React 19, TypeScript, Firebase, Gemini AI

---

## Documentation Structure

This documentation package consists of multiple detailed documents:

### 1. **PROJECT_OVERVIEW.md**
Comprehensive overview of the system architecture, technology stack, and design decisions.

**Contents:**
- Executive Summary
- Technology Stack
- System Architecture (3-tier)
- Component Architecture
- Project Structure
- Data Flow Architecture
- Key Design Decisions
- Security Considerations
- Performance Optimizations

### 2. **UML_DIAGRAMS.md**
Complete set of UML diagrams for system design and analysis.

**Contents:**
- Class Diagram (Domain Models & Services)
- Sequence Diagrams (5 key workflows)
- Use Case Diagram (10 major use cases)
- Component Diagram
- State Diagrams (2 state machines)

### 3. **WORKFLOW_GUIDE.md**
Detailed workflows and process documentation.

**Contents:**
- Overall Application Workflow
- Complete RAG Pipeline (3 phases)
- Feature-Specific Workflows (4 detailed flows)
- Tools & Technologies Deep Dive
- Data Management Patterns

### 4. **RAG_IMPLEMENTATION.md** (Existing)
Technical details of RAG implementation and monitoring.

**Contents:**
- RAG Architecture
- Data Flow
- Performance Metrics
- Monitoring Guidelines
- Troubleshooting
- Best Practices

---

## Quick Reference Guide

### System Architecture Summary

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │
│  React 19 + TypeScript + TailwindCSS    │
│  - 10 Pages                             │
│  - 6 Reusable Components                │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│         APPLICATION LAYER               │
│  - API Client (Gemini Integration)      │
│  - Firebase Service (CRUD Operations)   │
│  - Calendar Client (Google Calendar)    │
│  - Authentication (Firebase Auth)       │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│            DATA LAYER                   │
│  Firebase Firestore (NoSQL)             │
│  - User-isolated collections            │
│  - Real-time synchronization            │
└─────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.2.0 | UI Framework |
| | TypeScript | 5.8.2 | Type Safety |
| | Vite | 6.2.0 | Build Tool |
| | TailwindCSS | Latest | Styling |
| | React Router | 7.9.4 | Navigation |
| **Backend** | Firebase Auth | 12.4.0 | Authentication |
| | Firestore | 12.4.0 | Database |
| | Gemini AI | 1.27.0 | AI Features |
| | Google Calendar | Latest | Task Sync |
| **Dev Tools** | ts-node | 10.9.2 | Script Execution |
| | npm | Latest | Package Manager |

---

## Core Features

### 1. AI-Powered Q&A (RAG System)

**Description:** Context-aware question answering using Retrieval-Augmented Generation.

**How It Works:**
1. User uploads learning materials (text, links, documents)
2. Materials are indexed with status tracking
3. User asks questions with scope selection (Course/Notes/Web)
4. System retrieves relevant documents from Firestore
5. Gemini AI generates answer using retrieved context
6. Response includes answer text and source citations

**Key Components:**
- Query processor
- Document retriever (Firestore)
- Context builder
- Prompt engineer
- AI generator (Gemini 2.5 Flash)
- Response formatter

**Metrics:**
- Target Hit Rate: >85%
- Target Response Time: <3 seconds
- Target Quality Score: >4.0/5.0

### 2. Smart Summarization

**Description:** AI-generated summaries in multiple formats.

**Formats:**
- **Paragraph:** Cohesive narrative summary
- **Bullet Points:** Key takeaways list
- **Flashcards:** Question-answer pairs

**Process:**
1. User selects materials to summarize
2. User chooses output format
3. System fetches content from Firestore
4. Gemini AI generates formatted summary
5. User can copy or download result

**Model:** Gemini 2.5 Pro (with thinking budget)

### 3. Assessment Generator

**Description:** Automated quiz creation with explanations.

**Features:**
- Customizable question count (5, 10, 15)
- Multiple choice format (4 options)
- Immediate feedback
- Detailed explanations
- Score tracking

**Process:**
1. User enters topic and question count
2. System generates JSON schema
3. Gemini AI creates structured quiz
4. User takes quiz interactively
5. System calculates score and shows explanations

### 4. Study Planner

**Description:** AI-generated day-by-day study plans.

**Features:**
- Customizable duration (7-30 days)
- Task breakdown by day
- Estimated time per task
- Progress tracking
- Calendar export

**Process:**
1. User enters topic and duration
2. Gemini AI generates plan structure
3. System displays timeline view
4. User tracks completion
5. Optional sync to Google Calendar

### 5. Material Management

**Description:** Central repository for learning materials.

**Supported Types:**
- **Text Notes:** Direct text input
- **Web Links:** External resources
- **Documents:** File uploads (PDF, DOC, TXT)

**Features:**
- Course association
- AI indexing status
- Download functionality
- Real-time sync
- Search and filter

### 6. Note Taking

**Description:** Organize study notes by course.

**Features:**
- Rich text notes
- Audio note recording (planned)
- Course categorization
- Timestamp tracking
- Full-text search capability

### 7. Task Management

**Description:** Track assignments and deadlines.

**Features:**
- Create/edit/delete tasks
- Due date tracking
- Completion status
- Course association
- Google Calendar sync
- Upcoming tasks view

---

## RAG System Architecture

### Complete Pipeline

```
┌─────────────────────────────────────────────────┐
│              INGESTION PHASE                    │
├─────────────────────────────────────────────────┤
│  Upload → Validate → Store (indexing)           │
│        → Process → Update (ready)               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              RETRIEVAL PHASE                    │
├─────────────────────────────────────────────────┤
│  Query → Select Scope → Fetch Documents         │
│       → Rank by Relevance                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              GENERATION PHASE                   │
├─────────────────────────────────────────────────┤
│  Build Context → Construct Prompt               │
│       → Generate Answer → Format Response       │
└─────────────────────────────────────────────────┘
```

### Current Implementation
- **Retrieval:** Recency-based (last 25 documents)
- **Context:** Full documents as text
- **Model:** Gemini 2.5 Flash
- **Grounding:** Google Search for web queries

### Future Enhancements
- Vector database integration (Pinecone/Weaviate)
- Document chunking (512-1024 tokens)
- Embedding generation and storage
- Semantic similarity search
- Hybrid search (keyword + semantic)
- Reranking with cross-encoder
- User feedback loop

---

## Database Schema

### Firestore Structure

```
Collection: users
│
├── Document: {userId}
│   │
│   ├── Subcollection: courses
│   │   └── Document: {courseId}
│   │       ├── title: string
│   │       ├── description: string
│   │       ├── instructor: string
│   │       ├── coverImage: string
│   │       ├── url: string
│   │       ├── createdAt: timestamp
│   │       └── updatedAt: timestamp
│   │
│   ├── Subcollection: materials
│   │   └── Document: {materialId}
│   │       ├── name: string
│   │       ├── courseId: string (reference)
│   │       ├── type: 'text' | 'link' | 'document'
│   │       ├── url: string
│   │       ├── content: string
│   │       ├── createdAt: timestamp
│   │       └── aiStatus: 'ready' | 'indexing' | 'not_indexed'
│   │
│   ├── Subcollection: notes
│   │   └── Document: {noteId}
│   │       ├── title: string
│   │       ├── content: string
│   │       ├── createdAt: timestamp
│   │       ├── audioUrl?: string
│   │       └── courseId?: string
│   │
│   └── Subcollection: tasks
│       └── Document: {taskId}
│           ├── title: string
│           ├── description: string
│           ├── dueDate: timestamp
│           ├── completed: boolean
│           └── courseId?: string
```

### Data Isolation
Each user's data is stored in their own document path:
```
/users/{uid}/courses/*
/users/{uid}/materials/*
/users/{uid}/notes/*
/users/{uid}/tasks/*
```

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

---

## Key Workflows

### 1. User Authentication Flow

```
Login Page → Google OAuth → Firebase Auth
     ↓
User Token Received
     ↓
Check New User? → Yes → Seed Initial Data
     ↓              ↓
     No             ↓
     ↓              ↓
Dashboard ←─────────┘
```

### 2. Material Upload & Indexing

```
Fill Form → Validate → Create Doc (status: indexing)
     ↓
Show Success Toast
     ↓
Background: AI Processing (3 sec simulation)
     ↓
Update Status (ready)
     ↓
Show Ready Toast → Material available for RAG
```

### 3. RAG Q&A Process

```
User Question → Select Scope
     ↓
IF Course/Notes:
  Fetch Last 25 Docs → Build Context → Gemini AI
IF Web:
  Google Search Grounding → Gemini AI
     ↓
Generate Answer with Sources
     ↓
Display to User
```

### 4. Quiz Generation

```
Enter Topic + Count → Build Schema Prompt
     ↓
Gemini AI (JSON Mode)
     ↓
Parse & Validate
     ↓
Display Quiz → User Answers
     ↓
Calculate Score → Show Results + Explanations
```

---

## API Documentation

### API Client (apiClient.ts)

#### `ragChat(query, scope, user)`
**Purpose:** RAG-based question answering

**Parameters:**
- `query` (string): User's question
- `scope` (string): 'Course' | 'My Notes' | 'Web'
- `user` (User): Firebase user object

**Returns:**
```typescript
Promise<{
  text: string;           // AI-generated answer
  sources: Array<{        // Source citations
    title: string;
    uri: string;
  }>;
}>
```

**Example:**
```typescript
const response = await apiClient.ragChat(
  "What is machine learning?",
  "Course",
  currentUser
);
console.log(response.text);
console.log(response.sources);
```

#### `summarize(materialIds, format, user)`
**Purpose:** Generate AI summary

**Parameters:**
- `materialIds` (string[]): Array of material IDs
- `format` ('paragraph' | 'bullets' | 'flashcards')
- `user` (User): Firebase user object

**Returns:**
```typescript
Promise<string>  // Formatted summary text
```

#### `generateAssessment(topic, numQuestions)`
**Purpose:** Generate quiz

**Parameters:**
- `topic` (string): Quiz topic
- `numQuestions` (number): 5, 10, or 15

**Returns:**
```typescript
Promise<AssessmentQuiz> {
  topic: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}
```

#### `generatePlan(topic, duration)`
**Purpose:** Generate study plan

**Parameters:**
- `topic` (string): Study topic
- `duration` (number): Days (7-30)

**Returns:**
```typescript
Promise<PlanTask[]> {
  day: number;
  title: string;
  description: string;
  duration: string;
}[]
```

#### `ingestFile(materialId, user)`
**Purpose:** Process material for RAG (currently mocked)

**Parameters:**
- `materialId` (string): Document ID
- `user` (User): Firebase user object

**Returns:**
```typescript
Promise<{
  success: boolean;
  message: string;
}>
```

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local file

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini AI
API_KEY=your_gemini_api_key

# Google Calendar (Optional)
GOOGLE_CALENDAR_API_KEY=your_calendar_api_key
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
```

### Setup Steps

1. **Clone Repository**
```bash
git clone <repository_url>
cd shikshakx---ai-powered-learning-companion
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Firebase**
- Create Firebase project
- Enable Authentication (Google provider)
- Create Firestore database
- Add authorized domain: localhost
- Update `services/firebase.ts` with your config

4. **Configure Gemini AI**
- Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Set as environment variable

5. **Run Development Server**
```bash
npm run dev
```

6. **Access Application**
```
http://localhost:3000
```

---

## Testing Strategy

### Unit Testing (Future)
```typescript
// Example test structure
describe('apiClient', () => {
  describe('ragChat', () => {
    it('should return answer with sources for valid query', async () => {
      const response = await apiClient.ragChat(
        "test question",
        "Course",
        mockUser
      );
      expect(response.text).toBeDefined();
      expect(response.sources).toBeInstanceOf(Array);
    });
  });
});
```

### Integration Testing
- Firebase authentication flow
- Firestore CRUD operations
- Gemini AI API calls
- Real-time data synchronization

### E2E Testing
- User registration and login
- Complete RAG Q&A flow
- Material upload and indexing
- Quiz generation and completion
- Study plan creation

### Performance Testing
- Response time benchmarks
- Concurrent user load
- Database query optimization
- API rate limiting

---

## Deployment Guide

### Production Checklist

#### Security
- [ ] Update Firestore security rules for production
- [ ] Enable Firebase App Check
- [ ] Secure API keys in environment variables
- [ ] Enable HTTPS only
- [ ] Configure CORS properly

#### Performance
- [ ] Enable Firestore indexing
- [ ] Optimize bundle size
- [ ] Implement code splitting
- [ ] Enable caching strategies
- [ ] CDN for static assets

#### Monitoring
- [ ] Set up Firebase Analytics
- [ ] Configure error logging
- [ ] Monitor API usage
- [ ] Track RAG performance metrics
- [ ] Set up alerting

### Deployment Options

#### Option 1: Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

#### Option 2: Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

#### Option 3: Vercel
```bash
npm run build
vercel --prod
```

---

## Maintenance & Support

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check API usage quotas
- Review user feedback

**Weekly:**
- Database backup verification
- Performance metrics review
- Security audit

**Monthly:**
- Dependency updates
- Feature usage analysis
- Cost optimization review

### Troubleshooting Common Issues

#### Issue: "Unauthorized domain" error
**Solution:** Add domain to Firebase authorized domains

#### Issue: RAG returns no results
**Solution:** Check material indexing status and Firestore permissions

#### Issue: Slow response times
**Solution:** Optimize Firestore queries, check API latency

#### Issue: Quiz generation fails
**Solution:** Verify Gemini API key, check JSON schema validation

---

## Future Roadmap

### Phase 1 (Q1 2026)
- [ ] Implement vector database for semantic search
- [ ] Add document chunking strategy
- [ ] Enhanced RAG with embeddings
- [ ] Mobile responsive improvements

### Phase 2 (Q2 2026)
- [ ] Real file upload to Firebase Storage
- [ ] Audio note transcription
- [ ] Collaborative features
- [ ] Advanced analytics dashboard

### Phase 3 (Q3 2026)
- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Multi-language support
- [ ] Integration with LMS platforms

### Phase 4 (Q4 2026)
- [ ] Advanced AI tutoring
- [ ] Personalized learning paths
- [ ] Gamification features
- [ ] Social learning community

---

## Glossary

**RAG (Retrieval-Augmented Generation):** AI technique combining information retrieval with text generation to provide context-aware answers.

**Embedding:** Vector representation of text that captures semantic meaning.

**Vector Database:** Database optimized for storing and querying high-dimensional vectors.

**Firestore:** Google's NoSQL cloud database with real-time synchronization.

**Gemini:** Google's latest AI model family for various tasks.

**Chunking:** Breaking large documents into smaller, manageable pieces.

**Grounding:** Connecting AI responses to specific source documents.

**Token:** Unit of text (roughly 4 characters) used by language models.

**Semantic Search:** Search based on meaning rather than exact keywords.

**Hot Module Replacement (HMR):** Development feature for instant updates without full page reload.

---

## Contact & Support

### Development Team
- **Project Lead:** [Name]
- **Backend Developer:** [Name]
- **Frontend Developer:** [Name]
- **AI/ML Engineer:** [Name]

### Resources
- **Documentation:** `/docs/` folder
- **Repository:** [GitHub URL]
- **Issue Tracker:** [GitHub Issues URL]
- **Demo:** [Demo URL]

### Contributing
See `CONTRIBUTING.md` for guidelines on contributing to this project.

---

## License

[Specify License - e.g., MIT, Apache 2.0]

---

## Acknowledgments

- **Google Gemini AI** for advanced AI capabilities
- **Firebase** for backend infrastructure
- **React Team** for the UI framework
- **Open Source Community** for tools and libraries

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Status:** Complete

---

*For detailed technical information, refer to individual documentation files:*
- *PROJECT_OVERVIEW.md*
- *UML_DIAGRAMS.md*
- *WORKFLOW_GUIDE.md*
- *RAG_IMPLEMENTATION.md*
