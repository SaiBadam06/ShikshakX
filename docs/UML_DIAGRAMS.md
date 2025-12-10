# ShikshakX - UML Diagrams

**Version:** 1.0  
**Last Updated:** October 27, 2025

---

## Table of Contents
1. [Class Diagram](#class-diagram)
2. [Sequence Diagrams](#sequence-diagrams)
3. [Use Case Diagram](#use-case-diagram)
4. [Component Diagram](#component-diagram)
5. [State Diagram](#state-diagram)

---

## Class Diagram

### Domain Model Classes

```
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN MODELS                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│       User          │
│─────────────────────│
│ + uid: string       │
│ + email: string     │
│ + displayName: str  │
│ + photoURL: string  │
│─────────────────────│
│ + signIn()          │
│ + signOut()         │
└─────────────────────┘
         │
         │ owns (1:N)
         ↓
┌─────────────────────┐         ┌─────────────────────┐
│      Course         │         │      Material       │
│─────────────────────│         │─────────────────────│
│ + id: string        │←───────→│ + id: string        │
│ + title: string     │  1:N    │ + courseId: string  │
│ + description: str  │         │ + name: string      │
│ + instructor: str   │         │ + type: MaterialType│
│ + coverImage: str   │         │ + url: string       │
│ + url: string       │         │ + content: string   │
│ + createdAt: Date   │         │ + createdAt: Date   │
│ + updatedAt: Date   │         │ + aiStatus: Status  │
│─────────────────────│         │─────────────────────│
│ + addMaterial()     │         │ + download()        │
│ + removeMaterial()  │         │ + index()           │
└─────────────────────┘         │ + updateStatus()    │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│       Note          │         │       Task          │
│─────────────────────│         │─────────────────────│
│ + id: string        │         │ + id: string        │
│ + title: string     │         │ + title: string     │
│ + content: string   │         │ + description: str  │
│ + createdAt: Date   │         │ + dueDate: Date     │
│ + audioUrl: string  │         │ + completed: bool   │
│ + courseId: string  │         │ + courseId: string  │
│─────────────────────│         │─────────────────────│
│ + save()            │         │ + markComplete()    │
│ + delete()          │         │ + syncToCalendar()  │
│ + attachAudio()     │         └─────────────────────┘
└─────────────────────┘

┌─────────────────────────────────────┐
│          ChatMessage                │
│─────────────────────────────────────│
│ + id: string                        │
│ + text: string                      │
│ + sender: 'user' | 'bot'            │
│ + sources: Source[]                 │
│ + timestamp: Date                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       AssessmentQuiz                │
│─────────────────────────────────────│
│ + topic: string                     │
│ + questions: QuizQuestion[]         │
│─────────────────────────────────────│
│ + generate(topic, num): Quiz        │
│ + checkAnswers(): Score             │
└─────────────────────────────────────┘
         │
         │ contains (1:N)
         ↓
┌─────────────────────────────────────┐
│        QuizQuestion                 │
│─────────────────────────────────────│
│ + question: string                  │
│ + options: string[]                 │
│ + correctAnswer: string             │
│ + explanation: string               │
│─────────────────────────────────────│
│ + checkAnswer(answer): boolean      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           PlanTask                  │
│─────────────────────────────────────│
│ + day: number                       │
│ + title: string                     │
│ + description: string               │
│ + duration: string                  │
└─────────────────────────────────────┘
```

### Service Layer Classes

```
┌──────────────────────────────────────────────────────────┐
│                    SERVICE CLASSES                        │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│         apiClient                   │
│─────────────────────────────────────│
│ - ai: GoogleGenAI                   │
│─────────────────────────────────────│
│ + ragChat(query, scope, user)       │
│   → Promise<{text, sources}>        │
│                                     │
│ + summarize(ids, format, user)      │
│   → Promise<string>                 │
│                                     │
│ + generateAssessment(topic, num)    │
│   → Promise<AssessmentQuiz>         │
│                                     │
│ + generatePlan(topic, duration)     │
│   → Promise<PlanTask[]>             │
│                                     │
│ + ingestFile(materialId, user)      │
│   → Promise<{success, message}>     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       firebaseService               │
│─────────────────────────────────────│
│ + seedInitialData(uid): Promise     │
│ + createCourse(course): Promise     │
│ + updateCourse(id, data): Promise   │
│ + deleteCourse(id): Promise         │
│ + addMaterial(material): Promise    │
│ + updateMaterial(id, data): Promise │
│ + deleteMaterial(id): Promise       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       calendarClient                │
│─────────────────────────────────────│
│ - apiKey: string                    │
│ - clientId: string                  │
│ - tokenClient: TokenClient          │
│─────────────────────────────────────│
│ + initializeClient(): Promise       │
│ + requestAccessToken(): Promise     │
│ + addEventToCalendar(task): Promise │
│ + hasValidToken(): boolean          │
└─────────────────────────────────────┘
```

---

## Sequence Diagrams

### 1. User Authentication Flow

```
User             App          Firebase Auth    Firestore
 │                │                 │              │
 │  Click Login   │                 │              │
 │───────────────→│                 │              │
 │                │                 │              │
 │                │  Google OAuth   │              │
 │                │────────────────→│              │
 │                │                 │              │
 │                │  ← User Token   │              │
 │                │←────────────────│              │
 │                │                 │              │
 │                │ onAuthStateChanged             │
 │                │←────────────────│              │
 │                │                 │              │
 │                │        Check if new user       │
 │                │────────────────────────────────→│
 │                │                 │              │
 │                │        ← User exists?          │
 │                │←────────────────────────────────│
 │                │                 │              │
 │                │  IF NEW: Seed Initial Data     │
 │                │────────────────────────────────→│
 │                │                 │              │
 │                │        ← Success               │
 │                │←────────────────────────────────│
 │                │                 │              │
 │  ← Dashboard   │                 │              │
 │←───────────────│                 │              │
 │                │                 │              │
```

### 2. RAG-Based Q&A Flow (Course/Notes Scope)

```
User    QA Page   apiClient   Firestore   Gemini AI
 │         │          │            │           │
 │ Enter Q │          │            │           │
 │────────→│          │            │           │
 │         │          │            │           │
 │ Select  │          │            │           │
 │ Scope   │          │            │           │
 │────────→│          │            │           │
 │         │          │            │           │
 │  Submit │          │            │           │
 │────────→│          │            │           │
 │         │          │            │           │
 │         │ ragChat()│            │           │
 │         │─────────→│            │           │
 │         │          │            │           │
 │         │          │ Query top 25           │
 │         │          │  materials/notes       │
 │         │          │───────────→│           │
 │         │          │            │           │
 │         │          │ ← Documents│           │
 │         │          │←───────────│           │
 │         │          │            │           │
 │         │          │ Build context string   │
 │         │          │            │           │
 │         │          │ Construct RAG prompt   │
 │         │          │            │           │
 │         │          │ Generate Content       │
 │         │          │────────────────────────→│
 │         │          │            │           │
 │         │          │ ← AI Response          │
 │         │          │←────────────────────────│
 │         │          │            │           │
 │         │ ← {text, sources}     │           │
 │         │←─────────│            │           │
 │         │          │            │           │
 │  Display│          │            │           │
 │ Response│          │            │           │
 │←────────│          │            │           │
 │         │          │            │           │
```

### 3. Material Upload and Indexing Flow

```
User    Materials   Firestore   apiClient   Toast
 │       Page          │            │         │
 │         │           │            │         │
 │ Fill    │           │            │         │
 │ Form    │           │            │         │
 │────────→│           │            │         │
 │         │           │            │         │
 │ Submit  │           │            │         │
 │────────→│           │            │         │
 │         │           │            │         │
 │         │ Validate  │            │         │
 │         │           │            │         │
 │         │ Create Doc│            │         │
 │         │ (status:  │            │         │
 │         │ indexing) │            │         │
 │         │──────────→│            │         │
 │         │           │            │         │
 │         │ ← Doc ID  │            │         │
 │         │←──────────│            │         │
 │         │           │            │         │
 │         │           │            │    Success
 │         │           │            │    Toast
 │         │───────────────────────────────────→│
 │         │           │            │         │
 │         │ ingestFile()           │         │
 │         │ (async)   │            │         │
 │         │───────────────────────→│         │
 │         │           │            │         │
 │         │           │       Simulate       │
 │         │           │       Embedding      │
 │         │           │       (3 sec)        │
 │         │           │            │         │
 │         │           │      ← Success       │
 │         │←───────────────────────│         │
 │         │           │            │         │
 │         │ Update    │            │         │
 │         │ Status    │            │         │
 │         │ (ready)   │            │         │
 │         │──────────→│            │         │
 │         │           │            │         │
 │         │           │            │    Ready
 │         │           │            │    Toast
 │         │───────────────────────────────────→│
 │         │           │            │         │
```

### 4. Assessment Generation Flow

```
User   Assessments  apiClient   Gemini AI
 │       Page          │            │
 │         │           │            │
 │ Enter   │           │            │
 │ Topic + │           │            │
 │ # Qs    │           │            │
 │────────→│           │            │
 │         │           │            │
 │ Generate│           │            │
 │────────→│           │            │
 │         │           │            │
 │         │ generateAssessment()   │
 │         │──────────→│            │
 │         │           │            │
 │         │           │ Build prompt
 │         │           │ with schema│
 │         │           │            │
 │         │           │ Generate   │
 │         │           │ (JSON mode)│
 │         │           │───────────→│
 │         │           │            │
 │         │           │ ← Quiz JSON│
 │         │           │←───────────│
 │         │           │            │
 │         │ ← Parse & │            │
 │         │   Validate│            │
 │         │←──────────│            │
 │         │           │            │
 │  Display│           │            │
 │  Quiz   │           │            │
 │←────────│           │            │
 │         │           │            │
│ Answer   │           │            │
│ Questions│           │            │
 │────────→│           │            │
 │         │           │            │
 │  Show   │           │            │
 │  Results│           │            │
 │←────────│           │            │
 │         │           │            │
```

### 5. Study Plan Generation Flow

```
User    Planner   apiClient   Gemini AI
 │       Page        │            │
 │         │         │            │
 │ Enter   │         │            │
 │ Topic + │         │            │
 │ Duration│         │            │
 │────────→│         │            │
 │         │         │            │
 │ Generate│         │            │
 │────────→│         │            │
 │         │         │            │
 │         │ generatePlan()        │
 │         │────────→│            │
 │         │         │            │
 │         │         │ Build prompt
 │         │         │ with schema│
 │         │         │            │
 │         │         │ Generate   │
 │         │         │ (JSON mode)│
 │         │         │───────────→│
 │         │         │            │
 │         │         │ ← Plan JSON│
 │         │         │←───────────│
 │         │         │            │
 │         │ ← Parse │            │
 │         │←────────│            │
 │         │         │            │
 │  Display│         │            │
 │ Timeline│         │            │
 │←────────│         │            │
 │         │         │            │
```

---

## Use Case Diagram

```
                    ┌─────────────────────┐
                    │   ShikshakX System  │
                    └─────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ↓                     ↓                     ↓
┌─────────────┐      ┌─────────────┐     ┌─────────────┐
│   Student   │      │  Educator   │     │Self-Learner │
└─────────────┘      └─────────────┘     └─────────────┘
       │                     │                     │
       └──────────────┬──────┴──────┬──────────────┘
                      │             │
        ┌─────────────┴─────────────┴────────────┐
        │                                         │
        │  UC-01: Authentication                  │
        │   • Sign In with Google                 │
        │   • Sign Out                            │
        │                                         │
        │  UC-02: Course Management               │
        │   • View All Courses                    │
        │   • Add New Course                      │
        │   • Edit Course Details                 │
        │   • Delete Course                       │
        │                                         │
        │  UC-03: Material Management             │
        │   • Upload Text Notes                   │
        │   • Add Web Links                       │
        │   • Upload Documents                    │
        │   • View Materials                      │
        │   • Download Materials                  │
        │   • Track AI Indexing Status            │
        │                                         │
        │  UC-04: Note Taking                     │
        │   • Create Text Notes                   │
        │   • Record Audio Notes                  │
        │   • Organize by Course                  │
        │   • View All Notes                      │
        │                                         │
        │  UC-05: AI-Powered Q&A (RAG)            │
        │   • Ask Question                        │
        │   • Select Scope:                       │
        │     - Course Materials                  │
        │     - Personal Notes                    │
        │     - Web Search                        │
        │   • View AI Response                    │
        │   • Browse Sources                      │
        │                                         │
        │  UC-06: Smart Summarization             │
        │   • Select Materials                    │
        │   • Choose Format:                      │
        │     - Paragraph                         │
        │     - Bullet Points                     │
        │     - Flashcards                        │
        │   • Generate Summary                    │
        │   • Export Summary                      │
        │                                         │
        │  UC-07: Assessment Generation           │
        │   • Enter Quiz Topic                    │
        │   • Set Number of Questions             │
        │   • Generate Quiz                       │
        │   • Take Quiz                           │
        │   • View Results & Explanations         │
        │                                         │
        │  UC-08: Study Planning                  │
        │   • Enter Study Topic                   │
        │   • Set Study Duration                  │
        │   • Generate Study Plan                 │
        │   • View Day-by-Day Tasks               │
        │   • Track Progress                      │
        │                                         │
        │  UC-09: Task Management                 │
        │   • Create Task                         │
        │   • Set Due Date                        │
        │   • Mark as Complete                    │
        │   • Sync to Google Calendar             │
        │   • View Upcoming Tasks                 │
        │                                         │
        │  UC-10: Dashboard View                  │
        │   • View Statistics                     │
        │   • See Recent Materials                │
        │   • Check Upcoming Tasks                │
        │   • Quick Access to Features            │
        │                                         │
        └─────────────────────────────────────────┘

    External Systems:
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │ Firebase Auth │  │  Gemini AI    │  │Google Calendar│
    └───────────────┘  └───────────────┘  └───────────────┘
            ↑                  ↑                   ↑
            └──────────────────┴───────────────────┘
                        (extends)
```

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT DIAGRAM                         │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                    App Component                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  State: user, loading                               │ │
│  │  Effect: Authentication Listener                     │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ↓                 ↓                 ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Sidebar     │   │   Pages      │   │   Toast      │
│  Component   │   │  Component   │   │  Container   │
└──────────────┘   └──────────────┘   └──────────────┘
                          │
        ┌─────────────────┼─────────────────────────┐
        │                 │                         │
        ↓                 ↓                         ↓
┌─────────────┐  ┌─────────────┐   ┌─────────────────────┐
│ Dashboard   │  │ Materials   │   │  QA                 │
│ Component   │  │ Component   │   │  Component          │
│             │  │             │   │                     │
│ Services:   │  │ Services:   │   │  Services:          │
│ - Firestore │  │ - Firestore │   │  - apiClient.ragChat│
│             │  │ - apiClient │   │  - Firestore        │
└─────────────┘  └─────────────┘   └─────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │  AddMaterialForm      │
              │                       │
              │  Subcomponents:       │
              │  - SourceTypeSelector │
              │  - FileUpload         │
              │  - CourseSelector     │
              └───────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │  MaterialsList        │
              │                       │
              │  Subcomponents:       │
              │  - MaterialCard       │
              │  - AIStatusBadge      │
              │  - DownloadButton     │
              └───────────────────────┘
```

---

## State Diagram

### Material AI Indexing Status

```
           ┌─────────────────┐
           │   NOT_INDEXED   │
           └────────┬────────┘
                    │
           User uploads material
                    │
                    ↓
           ┌─────────────────┐
      ┌───→│    INDEXING     │
      │    └────────┬────────┘
      │             │
      │    AI processing (3 sec)
      │             │
      │   ┌─────────┴─────────┐
      │   │                   │
      │   ↓                   ↓
      │ Success            Failure
      │   │                   │
      │   ↓                   │
      │ ┌─────────────────┐  │
      │ │      READY      │  │
      │ └─────────────────┘  │
      │                      │
      └──────────────────────┘
       (Retry on failure)
```

### Quiz State Machine

```
        ┌─────────────┐
        │   INITIAL   │
        └──────┬──────┘
               │
          User enters topic
               │
               ↓
        ┌─────────────┐
        │  GENERATING │
        └──────┬──────┘
               │
        Gemini AI creates quiz
               │
          ┌────┴────┐
          │         │
        Success   Failure
          │         │
          ↓         ↓
   ┌─────────────┐  ┌──────────┐
   │   READY     │  │  ERROR   │
   └──────┬──────┘  └────┬─────┘
          │              │
    User starts quiz     └─→ Retry
          │
          ↓
   ┌─────────────┐
   │  IN_PROGRESS│
   └──────┬──────┘
          │
   User answers questions
          │
          ↓
   ┌─────────────┐
   │  COMPLETED  │
   └──────┬──────┘
          │
    Show results
          │
          ↓
   ┌─────────────┐
   │   REVIEWED  │
   └─────────────┘
```

---

*Next: See WORKFLOW_GUIDE.md for detailed feature workflows*
