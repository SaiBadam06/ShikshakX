# ShikshakX

ShikshakX is an AI-powered learning workspace built with React, Vite, Firebase, and Groq-powered study features. It includes courses, materials, notes, tasks, planner, assessments, community, Q&A, and Google Calendar sync.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in the project root.
3. Install dependencies:

```bash
npm install
```

4. Copy the environment template:

```bash
copy .env.example .env
```

5. Fill in the values inside `.env`.
6. Start the app:

```bash
npm run dev
```

7. Open the local URL shown by Vite, usually `http://localhost:5173`.

## Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Required environment variables

Create a `.env` file in the project root with these variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_GOOGLE_API_KEY=
VITE_GOOGLE_CLIENT_ID=

VITE_GROQ_API_KEY=
```

## Firebase setup

1. Create a Firebase project.
2. Add a Web app in Firebase.
3. Copy the Firebase web config values into your `.env`.
4. Enable:
   - Authentication
   - Firestore Database
   - Storage
5. Add `localhost` to Firebase Authentication authorized domains for local sign-in.
6. Make sure your Firestore and Storage rules allow your intended development access.

## Google Calendar setup

1. Use the same Google Cloud project or another project with Calendar API enabled.
2. Enable `Google Calendar API`.
3. Create an OAuth client for a Web application.
4. Add your local origin, usually:

```text
http://localhost:5173
```

5. Copy the API key and OAuth client ID into:
   - `VITE_GOOGLE_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`

If Calendar connect fails, the most common issue is a missing or incorrect Authorized JavaScript origin.

## AI setup

The app uses Groq for:
- RAG answers
- study planning
- quiz generation
- summarization fallback paths

Set `VITE_GROQ_API_KEY` in `.env` to enable live AI responses.

## Project scripts

```bash
npm run dev
npm run build
npm run preview
npm run seed:courses
```

## Notes

- New users start with an empty task list.
- Planner history is saved in Firestore.
- Materials now support text uploads plus document uploads like PDF and DOCX.
- Text-style uploads are indexed for AI. Document uploads are stored in the library for download/open, but text extraction for PDF/DOCX is not implemented yet.

## Troubleshooting

### Google sign-in fails with `unauthorized-domain`
Add `localhost` to Firebase Authentication authorized domains.

### Google Calendar connect fails
Check the OAuth client origin in Google Cloud and make sure it exactly matches the URL you opened in the browser.

### Firestore permission errors
Review your Firestore rules and confirm the app is using the correct Firebase project from `.env`.

### Storage upload errors
Make sure Firebase Storage is enabled and `VITE_FIREBASE_STORAGE_BUCKET` is correct.
