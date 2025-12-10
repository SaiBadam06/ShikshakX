# ShikshakX - Project Overview & Architecture

**Version:** 1.0  
**Last Updated:** October 27, 2025  
**Project Type:** AI-Powered Learning Companion Web Application

---

## Executive Summary

### Project Overview
ShikshakX is an AI-powered learning companion designed to enhance the educational experience through intelligent features like Q&A assistance, automated summarization, assessment generation, and study planning. The application leverages Google's Gemini AI and Retrieval-Augmented Generation (RAG) to provide contextual, personalized learning support.

### Key Features
- **AI-Powered Q&A**: Context-aware question answering using RAG
- **Smart Summarization**: Generate summaries in multiple formats (paragraph, bullets, flashcards)
- **Automated Assessments**: AI-generated quizzes based on study topics
- **Study Planner**: Personalized learning plans with time management
- **Material Management**: Organize and index learning materials
- **Note Taking**: Audio and text-based note management
- **Task Management**: Track assignments with Google Calendar integration
- **Course Organization**: Manage multiple courses and materials

### Target Users
- Students seeking AI-powered learning assistance
- Self-learners managing multiple educational resources
- Educators looking for automated assessment tools

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.0 | UI Framework |
| **TypeScript** | 5.8.2 | Type Safety & Development |
| **Vite** | 6.2.0 | Build Tool & Dev Server |
| **React Router DOM** | 7.9.4 | Client-Side Routing |
| **TailwindCSS** | (via CDN) | Styling Framework |
| **Heroicons** | 2.2.0 | Icon Library |

### Backend & Services

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | User authentication & session management |
| **Firebase Firestore** | NoSQL database for user data |
| **Google Gemini AI** | AI model for RAG, summarization, assessments |
| **Google Calendar API** | Task synchronization |

### Development Tools

| Tool | Purpose |
|------|---------|
| **npm** | Package Management |
| **ts-node** | TypeScript execution for scripts |
| **Git** | Version control |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   React 19 + TypeScript + Vite + TailwindCSS       │   │
│  │   - Pages (Dashboard, QA, Materials, etc.)          │   │
│  │   - Components (Sidebar, Modal, Toast)              │   │
│  │   - Services (API Client, Firebase, Gemini)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   API/SERVICE LAYER                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Firebase Auth   │  │  Gemini AI API   │                │
│  │  - User Auth     │  │  - RAG Chat      │                │
│  │  - Session Mgmt  │  │  - Summarization │                │
│  └──────────────────┘  │  - Assessment    │                │
│                        │  - Planning      │                │
│  ┌──────────────────┐  └──────────────────┘                │
│  │  Google Calendar │                                       │
│  │  API Integration │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Firebase Firestore (NoSQL Database)         │   │
│  │  Collections:                                        │   │
│  │  - users/                                            │   │
│  │    ├── {uid}/courses/                               │   │
│  │    ├── {uid}/materials/                             │   │
│  │    ├── {uid}/notes/                                 │   │
│  │    ├── {uid}/tasks/                                 │   │
│  │    └── {uid}/settings/                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
App (Root Component)
├── Authentication State Management
│   ├── onAuthStateChanged Listener
│   ├── User Session Management
│   └── Initial Data Seeding
│
├── HashRouter (React Router)
│   └── Routes
│       ├── /login → Login Page
│       ├── /dashboard → Dashboard Page
│       ├── /courses → Courses Management
│       ├── /materials → Materials Library
│       ├── /notes → Notes Management
│       ├── /qa → Q&A Interface
│       ├── /summarize → Summarization Tool
│       ├── /assessments → Quiz Generation
│       ├── /planner → Study Planner
│       └── /tasks → Task Management
│
└── Layout (Authenticated)
    ├── Sidebar
    │   ├── Logo
    │   ├── Navigation Links
    │   └── UserProfile + SignOut
    │
    └── Main Content Area
        └── Outlet (Current Page)
```

---

## Project Structure

```
shikshakx---ai-powered-learning-companion/
│
├── components/                 # Reusable UI components
│   ├── ConfigErrorBanner.tsx
│   ├── CourseCard.tsx
│   ├── GoogleCalendarConfigBanner.tsx
│   ├── Modal.tsx
│   ├── Sidebar.tsx
│   └── Toast.tsx
│
├── pages/                      # Page components
│   ├── Dashboard.tsx          # Main dashboard
│   ├── Courses.tsx            # Course management
│   ├── Materials.tsx          # Material library
│   ├── Notes.tsx              # Note taking
│   ├── QA.tsx                 # RAG-based Q&A
│   ├── Summarize.tsx          # AI summarization
│   ├── Assessments.tsx        # Quiz generation
│   ├── Planner.tsx            # Study planning
│   ├── Tasks.tsx              # Task management
│   └── Login.tsx              # Authentication
│
├── services/                   # Business logic & API clients
│   ├── apiClient.ts           # Gemini AI integration
│   ├── firebase.ts            # Firebase configuration
│   ├── firebaseService.ts     # Firestore operations
│   ├── geminiService.ts       # Gemini utilities
│   ├── calendarClient.ts      # Google Calendar API
│   └── dummyData.ts           # Seed data
│
├── scripts/                    # Utility scripts
│   └── seedCourses.ts         # Database seeding
│
├── docs/                       # Documentation
│   ├── RAG_IMPLEMENTATION.md
│   ├── PROJECT_OVERVIEW.md
│   ├── UML_DIAGRAMS.md
│   └── WORKFLOW_GUIDE.md
│
├── types.ts                    # TypeScript type definitions
├── App.tsx                     # Root application component
├── index.tsx                   # Application entry point
├── index.html                  # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies & scripts
├── .env.example                # Environment variables template
└── README.md                   # Setup instructions
```

---

## Data Flow Architecture

### 1. Authentication Flow
```
User → Login Page → Firebase Auth → Token
  ↓
App Component → onAuthStateChanged
  ↓
Seed Initial Data (if new user)
  ↓
Redirect to Dashboard
```

### 2. Material Upload Flow
```
User → Fill Form → Submit
  ↓
Validate Input
  ↓
Create Firestore Document (status: indexing)
  ↓
Show Success Toast
  ↓
Background: AI Ingestion (3 sec simulation)
  ↓
Update Document (status: ready)
  ↓
Show Ready Toast
```

### 3. RAG Q&A Flow
```
User → Enter Question → Select Scope
  ↓
IF Scope = Course/Notes:
  Firestore → Fetch Last 25 Documents
  ↓
  Build Context String
  ↓
  Gemini AI → Generate Answer
  
IF Scope = Web:
  Gemini AI → Google Search Grounding
  ↓
Return Response + Sources
```

---

## Key Design Decisions

### 1. Firebase Firestore (NoSQL)
**Why**: 
- Real-time data synchronization
- Scalable without server management
- Integrated authentication
- Free tier sufficient for MVP

### 2. Gemini AI (Google)
**Why**:
- State-of-the-art language model
- Built-in grounding for web search
- Generous free tier
- JSON mode for structured outputs

### 3. Client-Side Architecture
**Why**:
- Faster development
- No backend server needed
- Reduced infrastructure costs
- Suitable for MVP scale

### 4. RAG without Vector Database
**Why (Current)**:
- Simpler implementation
- Good enough for personal use
- Minimal infrastructure

**Future**: Will implement vector DB for production scale

### 5. TypeScript
**Why**:
- Type safety prevents bugs
- Better IDE support
- Improved maintainability
- Industry standard

---

## Security Considerations

### 1. Authentication
- Firebase Authentication with Google OAuth
- User sessions managed by Firebase
- No password storage

### 2. Data Access
- Firestore security rules enforce user isolation
- Each user can only access their own data
- Rules: `users/{uid}/**`

### 3. API Keys
- Gemini API key via environment variable
- Calendar API keys in separate config
- No keys in version control

### 4. HTTPS
- All API calls over HTTPS
- Firebase enforces encryption

---

## Performance Optimizations

### 1. Code Splitting
- React Router lazy loading (future)
- Component-level splitting

### 2. Firestore Queries
- Indexed queries for performance
- Limit results (25 docs max)
- Ordered by timestamp

### 3. Caching
- Browser caching for static assets
- Firebase caching for authentication

### 4. Build Optimization
- Vite for fast builds
- Tree shaking unused code
- Minification in production

---

*Next: See UML_DIAGRAMS.md for detailed system diagrams*
