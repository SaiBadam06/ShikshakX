# ShikshakX - Workflow Guide

**Version:** 1.0  
**Last Updated:** October 27, 2025

---

## Table of Contents
1. [System Workflows](#system-workflows)
2. [RAG System Details](#rag-system-details)
3. [Feature-Specific Workflows](#feature-specific-workflows)
4. [Tools & Technologies](#tools--technologies)
5. [Data Management](#data-management)

---

## System Workflows

### Overall Application Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                             │
└──────────────────────────────────────────────────────────────┘

START
  │
  ↓
┌─────────────────────┐
│  Landing/Login Page │
└──────────┬──────────┘
           │
           ↓
    ┌──────────────────┐
    │  Authentication  │
    │  (Google OAuth)  │
    └────────┬─────────┘
             │
             ↓
      ┌─────────────┐          ┌──────────────────┐
      │  New User?  │─── Yes ──→│  Seed Initial    │
      └──────┬──────┘          │  Data            │
             │                 └────────┬─────────┘
            No                          │
             │                          │
             └──────────┬───────────────┘
                        │
                        ↓
            ┌──────────────────────┐
            │  Dashboard           │
            │  - View Stats        │
            │  - Recent Materials  │
            │  - Upcoming Tasks    │
            └──────────┬───────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ↓             ↓             ↓
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Courses │   │Materials│   │  Tasks  │
   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │
        └──────┬──────┴──────┬──────┘
               │             │
         ┌─────┴─────┐ ┌─────┴─────┐
         │           │ │           │
         ↓           ↓ ↓           ↓
    ┌────────┐  ┌────────┐  ┌───────────┐
    │  Q&A   │  │Summary │  │Assessment │
    │ (RAG)  │  │  AI    │  │  Generator│
    └────────┘  └────────┘  └───────────┘
         │           │           │
         └───────────┴───────────┘
                     │
                     ↓
           ┌──────────────────┐
           │  Study Planner   │
           └──────────────────┘
                     │
                     ↓
                   END
```

---

## RAG System Details

### Complete RAG Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│               RAG (Retrieval-Augmented Generation)           │
│                       COMPLETE FLOW                          │
└──────────────────────────────────────────────────────────────┘

PHASE 1: INGESTION (Material Upload)
────────────────────────────────────
┌────────────────────┐
│  User Uploads      │
│  Material          │
│  - Text            │
│  - Link            │
│  - Document        │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│  Validate &        │
│  Store in          │
│  Firestore         │
│  (status:          │
│   indexing)        │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│  Simulate          │
│  AI Processing     │
│  - Extract text    │
│  - Create chunks   │
│  - Generate        │
│    embeddings      │
│  (Currently mocked)│
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│  Update Status     │
│  to 'ready'        │
└────────────────────┘


PHASE 2: QUERY PROCESSING
──────────────────────────
┌────────────────────┐
│  User Asks         │
│  Question          │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│  Select Scope      │
│  - Course          │
│  - My Notes        │
│  - Web             │
└─────────┬──────────┘
          │
    ┌─────┴─────┐
    │           │
    ↓           ↓
┌─────────┐ ┌─────────┐
│ Local   │ │   Web   │
│ Scope   │ │  Scope  │
└────┬────┘ └────┬────┘
     │           │
     ↓           ↓
     │      ┌─────────────────┐
     │      │ Google Search   │
     │      │ Grounding       │
     │      └────────┬────────┘
     │               │
     │               ↓
     │      ┌─────────────────┐
     │      │ Return Results  │
     │      │ with Sources    │
     │      └─────────────────┘
     │
     ↓
┌──────────────────────┐
│  Fetch Documents     │
│  from Firestore      │
│  - Query: materials/ │
│    or notes/         │
│  - Order: createdAt  │
│  - Limit: 25 docs    │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Build Context       │
│  String              │
│                      │
│  Format:             │
│  --- START DOC ---   │
│  [Content]           │
│  --- END DOC ---     │
│  ...                 │
└──────────┬───────────┘
           │
           ↓


PHASE 3: GENERATION
───────────────────
┌──────────────────────┐
│  Construct RAG       │
│  Prompt:             │
│                      │
│  "You are an expert  │
│   Q&A system...      │
│                      │
│   QUESTION:          │
│   [User query]       │
│                      │
│   DOCUMENTS:         │
│   [Context string]   │
│                      │
│   ANSWER:"           │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Send to Gemini AI   │
│  - Model: gemini-    │
│    2.5-flash         │
│  - Input: Prompt     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Gemini Processes:   │
│  1. Reads all docs   │
│  2. Identifies       │
│     relevant info    │
│  3. Synthesizes      │
│     answer           │
│  4. Cites sources    │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Return Response:    │
│  {                   │
│    text: "Answer"    │
│    sources: [...]    │
│  }                   │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Display to User     │
│  - Answer text       │
│  - Source links      │
│  - Scroll to view    │
└──────────────────────┘
```

### How RAG Works Step-by-Step

#### 1. **Document Ingestion** (Currently Simplified)
```typescript
// When user uploads material
const newMaterial = {
  name: "Introduction to AI",
  content: "AI is the simulation of human intelligence...",
  type: "text",
  courseId: "course-123",
  aiStatus: "indexing"  // Start in indexing state
};

// Save to Firestore
await addDoc(collection(db, "users", uid, "materials"), newMaterial);

// Simulate AI processing (in production: generate embeddings)
await apiClient.ingestFile(materialId, user);

// Update status
await updateDoc(doc(db, "users", uid, "materials", materialId), {
  aiStatus: "ready"
});
```

**Production Enhancement Needed:**
- Split document into chunks (512-1024 tokens)
- Generate embeddings using text-embedding model
- Store in vector database (Pinecone, Weaviate, etc.)

#### 2. **Query Processing**
```typescript
// User asks: "What is machine learning?"
const query = "What is machine learning?";
const scope = "Course";  // Search in course materials

// Fetch relevant documents (currently: last 25 docs)
const materialsQuery = query(
  collection(db, "users", uid, "materials"),
  orderBy("createdAt", "desc"),
  limit(25)
);
```

**Production Enhancement Needed:**
- Convert query to embedding
- Perform semantic search in vector DB
- Retrieve top-k most similar chunks (k=5-10)

#### 3. **Context Building**
```typescript
let contextText = '';
documents.forEach(doc => {
  contextText += `--- START OF DOCUMENT: "${doc.name}" ---\n`;
  contextText += `${doc.content}\n`;
  contextText += `--- END OF DOCUMENT ---\n\n`;
});

// Example output:
/*
--- START OF DOCUMENT: "AI Basics" ---
Artificial Intelligence (AI) is...
--- END OF DOCUMENT ---

--- START OF DOCUMENT: "ML Fundamentals" ---
Machine Learning is a subset of AI...
--- END OF DOCUMENT ---
*/
```

#### 4. **Prompt Engineering**
```typescript
const prompt = `You are an expert Q&A system performing RAG.

Follow these steps:
1. Read all provided documents
2. Identify relevant information
3. Synthesize a concise answer
4. Use ONLY information from documents
5. If no answer found, say so clearly

QUESTION:
"${userQuery}"

DOCUMENTS:
${contextText}

ANSWER:`;
```

#### 5. **AI Generation**
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt
});

return {
  text: response.text,
  sources: documents.map(d => ({
    title: d.name,
    uri: d.url
  }))
};
```

### RAG Performance Metrics

#### **Retrieval Quality**
```
Metric: Hit Rate
────────────────
Formula: (Queries with relevant results) / (Total queries)

Example:
- 80 queries had relevant documents retrieved
- 100 total queries
- Hit Rate = 80/100 = 80%

Target: > 85%
```

#### **Answer Quality**
```
Metric: Human Evaluation Score
───────────────────────────────
Scale: 1-5
- 5: Perfect answer with sources
- 4: Good answer, minor issues
- 3: Acceptable but incomplete
- 2: Partially correct
- 1: Incorrect or no answer

Target Average: > 4.0
```

#### **Response Time**
```
Metric: P95 Latency
───────────────────
Measures: 95th percentile response time

Target:
- Local RAG: < 3 seconds
- Web search: < 5 seconds
```

---

## Feature-Specific Workflows

### 1. Material Management Workflow

```
┌─────────────────────────────────────────────┐
│         MATERIAL MANAGEMENT                  │
└─────────────────────────────────────────────┘

User Opens Materials Page
  │
  ↓
Display Current Materials
  ├─ Material Cards
  ├─ AI Status Badges
  └─ Download Buttons
  │
  ↓
User Clicks "Add Material"
  │
  ├─→ SELECT SOURCE TYPE ←─┐
  │   ├─ Text Note          │
  │   ├─ Web Link           │
  │   └─ File Upload        │
  │                         │
  ├─→ FILL FORM             │
  │   ├─ Title              │
  │   ├─ Content/URL/File   │
  │   └─ Select Course      │
  │                         │
  ├─→ VALIDATE              │
  │   ├─ Required fields    │
  │   └─ Format check       │
  │                         │
  ├─→ SUBMIT                │
  │                         │
  ├─→ CREATE FIRESTORE DOC  │
  │   └─ Status: indexing   │
  │                         │
  ├─→ SHOW SUCCESS TOAST    │
  │                         │
  ├─→ START AI PROCESSING   │
  │   (Background)          │
  │   ├─ Extract text       │
  │   ├─ Generate embeddings│
  │   └─ Store in vector DB │
  │                         │
  ├─→ UPDATE STATUS: ready  │
  │                         │
  └─→ SHOW READY TOAST      │
                            │
                            ↓
                    Material Available
                    for RAG Q&A
```

### 2. AI Summarization Workflow

```
┌─────────────────────────────────────────────┐
│           SUMMARIZATION WORKFLOW            │
└─────────────────────────────────────────────┘

User Opens Summarize Page
  │
  ↓
SELECT MATERIALS TO SUMMARIZE
  ├─ Checkbox selection
  ├─ Multiple materials allowed
  └─ Preview content
  │
  ↓
CHOOSE OUTPUT FORMAT
  ├─ Paragraph (cohesive summary)
  ├─ Bullets (key points)
  └─ Flashcards (Q&A format)
  │
  ↓
CLICK "Generate Summary"
  │
  ↓
FETCH MATERIAL CONTENT
  ├─ Query Firestore
  ├─ Get text content
  └─ Build context string
  │
  ↓
CONSTRUCT PROMPT
  ├─ Base instruction
  ├─ Format specification
  └─ Document content
  │
  ↓
SEND TO GEMINI AI
  ├─ Model: gemini-2.5-pro
  ├─ Thinking budget: 32768
  └─ Wait for response
  │
  ↓
DISPLAY SUMMARY
  ├─ Formatted output
  ├─ Copy button
  └─ Download option
```

**Format Examples:**

```markdown
PARAGRAPH FORMAT:
─────────────────
### Summary
This chapter introduces machine learning as a subset
of artificial intelligence. It covers supervised and
unsupervised learning methods, with emphasis on...

BULLET FORMAT:
──────────────
### Key Takeaways
* Machine learning is a subset of AI
* Two main types: supervised and unsupervised
* Supervised learning uses labeled data
* Common algorithms: regression, classification
* Applications include spam detection, image recognition

FLASHCARD FORMAT:
─────────────────
What is machine learning?
///
A subset of AI that enables systems to learn from
data without explicit programming.
---
What are the two main types of ML?
///
Supervised learning and unsupervised learning.
---
```

### 3. Assessment Generation Workflow

```
┌─────────────────────────────────────────────┐
│          ASSESSMENT WORKFLOW                │
└─────────────────────────────────────────────┘

User Opens Assessments Page
  │
  ↓
ENTER QUIZ PARAMETERS
  ├─ Topic (e.g., "Python Programming")
  └─ Number of Questions (5, 10, 15)
  │
  ↓
CLICK "Generate Quiz"
  │
  ↓
CONSTRUCT PROMPT WITH SCHEMA
  ├─ Define JSON structure
  │   {
  │     topic: string
  │     questions: [{
  │       question: string
  │       options: string[]
  │       correctAnswer: string
  │       explanation: string
  │     }]
  │   }
  └─ Build generation prompt
  │
  ↓
GENERATE WITH GEMINI AI
  ├─ Model: gemini-2.5-pro
  ├─ JSON mode enabled
  ├─ Response schema validation
  └─ Thinking budget: 32768
  │
  ↓
PARSE & VALIDATE RESPONSE
  ├─ Check JSON structure
  ├─ Verify all fields present
  └─ Validate 4 options per question
  │
  ↓
DISPLAY QUIZ INTERFACE
  ├─ Question counter
  ├─ Radio button options
  ├─ Next/Previous buttons
  └─ Submit button
  │
  ↓
USER TAKES QUIZ
  ├─ Select answers
  ├─ Navigate questions
  └─ Submit when complete
  │
  ↓
CALCULATE RESULTS
  ├─ Count correct answers
  ├─ Calculate percentage
  └─ Identify wrong answers
  │
  ↓
SHOW RESULTS PAGE
  ├─ Score display
  ├─ Correct/incorrect indicators
  ├─ Explanations for each question
  └─ Option to retake
```

### 4. Study Planner Workflow

```
┌─────────────────────────────────────────────┐
│          STUDY PLANNER WORKFLOW             │
└─────────────────────────────────────────────┘

User Opens Planner Page
  │
  ↓
ENTER PLAN PARAMETERS
  ├─ Study Topic
  └─ Duration (7, 14, 30 days)
  │
  ↓
CLICK "Generate Plan"
  │
  ↓
CONSTRUCT PROMPT
  ├─ Topic description
  ├─ Duration specification
  └─ JSON schema for tasks
  │
  ↓
GENERATE WITH GEMINI AI
  ├─ Model: gemini-2.5-pro
  ├─ JSON mode
  └─ Schema: PlanTask[]
  │
  ↓
PARSE RESPONSE
  ├─ Validate structure
  ├─ Check day numbers
  └─ Verify all fields
  │
  ↓
DISPLAY TIMELINE
  ├─ Day-by-day cards
  ├─ Task titles
  ├─ Descriptions
  ├─ Estimated duration
  └─ Progress tracking
  │
  ↓
USER INTERACTION
  ├─ Check off completed tasks
  ├─ View task details
  └─ Export to calendar
```

---

## Tools & Technologies

### Development Tools

#### **1. Vite (Build Tool)**
```yaml
Purpose: Fast development server and build tool
Features:
  - Hot Module Replacement (HMR)
  - Lightning-fast cold starts
  - Optimized production builds
  - TypeScript support
  
Commands:
  - npm run dev    # Start dev server
  - npm run build  # Production build
  - npm run preview # Preview build
```

#### **2. TypeScript**
```yaml
Purpose: Type-safe JavaScript
Benefits:
  - Catch errors at compile time
  - Better IDE autocomplete
  - Improved maintainability
  - Self-documenting code
  
Configuration: tsconfig.json
  - Target: ES2020
  - Module: ESNext
  - Strict mode: enabled
```

#### **3. React 19**
```yaml
Purpose: UI framework
Key Features Used:
  - Functional components
  - Hooks (useState, useEffect)
  - React Router for navigation
  - Component composition
  
Patterns:
  - Controlled components
  - Prop drilling (minimal)
  - Event handling
```

### Backend Services

#### **1. Firebase Authentication**
```typescript
// Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Usage
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
```

#### **2. Firebase Firestore**
```typescript
// Database Structure
users/
  {uid}/
    courses/
      {courseId}/
        - title
        - description
        - instructor
        - coverImage
        - url
        - createdAt
        - updatedAt
    
    materials/
      {materialId}/
        - name
        - courseId
        - type
        - url
        - content
        - createdAt
        - aiStatus
    
    notes/
      {noteId}/
        - title
        - content
        - createdAt
        - audioUrl
        - courseId
    
    tasks/
      {taskId}/
        - title
        - description
        - dueDate
        - completed
        - courseId

// Query Example
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const materialsQuery = query(
  collection(db, "users", uid, "materials"),
  orderBy("createdAt", "desc"),
  limit(25)
);

const snapshot = await getDocs(materialsQuery);
```

#### **3. Google Gemini AI**
```typescript
// Configuration
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY 
});

// RAG Chat
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    tools: [{ googleSearch: {} }],  // For web search
  }
});

// Structured Output (JSON mode)
const response = await ai.models.generateContent({
  model: "gemini-2.5-pro",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: schema,
    thinkingConfig: { thinkingBudget: 32768 },
  }
});
```

### Styling & UI

#### **TailwindCSS**
```html
<!-- Example usage -->
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
  <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">
    Title
  </h2>
  <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
    Submit
  </button>
</div>

<!-- Key patterns -->
- Responsive: sm:, md:, lg:, xl: prefixes
- Dark mode: dark: prefix
- State variants: hover:, focus:, active:
```

#### **Heroicons**
```tsx
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';

<DocumentTextIcon className="h-6 w-6 text-blue-500" />
<ArrowDownTrayIcon className="h-5 w-5" />
```

---

## Data Management

### Database Schema (Firestore)

```
Collection: users
├── Document: {uid}
│   ├── Field: email (string)
│   ├── Field: displayName (string)
│   ├── Field: createdAt (timestamp)
│   │
│   ├── Subcollection: courses
│   │   └── Document: {courseId}
│   │       ├── title (string)
│   │       ├── description (string)
│   │       ├── instructor (string)
│   │       ├── coverImage (string)
│   │       ├── url (string)
│   │       ├── createdAt (timestamp)
│   │       └── updatedAt (timestamp)
│   │
│   ├── Subcollection: materials
│   │   └── Document: {materialId}
│   │       ├── name (string)
│   │       ├── courseId (string)
│   │       ├── type (string: 'text'|'link'|'document')
│   │       ├── url (string)
│   │       ├── content (string)
│   │       ├── createdAt (timestamp)
│   │       └── aiStatus (string: 'ready'|'indexing'|'not_indexed')
│   │
│   ├── Subcollection: notes
│   │   └── Document: {noteId}
│   │       ├── title (string)
│   │       ├── content (string)
│   │       ├── createdAt (timestamp)
│   │       ├── audioUrl (string, optional)
│   │       └── courseId (string)
│   │
│   └── Subcollection: tasks
│       └── Document: {taskId}
│           ├── title (string)
│           ├── description (string)
│           ├── dueDate (timestamp)
│           ├── completed (boolean)
│           └── courseId (string)
```

### Data Access Patterns

```typescript
// CREATE
await addDoc(collection(db, "users", uid, "materials"), materialData);

// READ (Single)
const docRef = doc(db, "users", uid, "materials", materialId);
const docSnap = await getDoc(docRef);

// READ (Query)
const q = query(
  collection(db, "users", uid, "materials"),
  where("courseId", "==", courseId),
  orderBy("createdAt", "desc"),
  limit(10)
);
const querySnapshot = await getDocs(q);

// UPDATE
await updateDoc(doc(db, "users", uid, "materials", materialId), {
  aiStatus: "ready"
});

// DELETE
await deleteDoc(doc(db, "users", uid, "materials", materialId));

// REAL-TIME LISTENER
onSnapshot(q, (snapshot) => {
  snapshot.forEach((doc) => {
    console.log(doc.data());
  });
});
```

---

*See RAG_IMPLEMENTATION.md for detailed RAG monitoring and evaluation*
