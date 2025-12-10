# ShikshakX - Local Development & Setup Guide

Welcome to ShikshakX! This guide provides detailed, step-by-step instructions to get the application running on your local computer. Following these steps carefully will help you avoid common configuration errors.

## 🎯 What You'll Achieve
By the end of this guide, you will have a fully functional local version of the ShikshakX application connected to your own private backend services.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following software installed on your computer:

1.  **Node.js**: This is the environment that runs the application. You can download it from [nodejs.org](https://nodejs.org/). Version 18 or higher is recommended.
2.  **A Code Editor**: A good editor will make the process much easier. [Visual Studio Code](https://code.visualstudio.com/) is a free and popular choice.
3.  **A Web Browser**: Such as Google Chrome or Firefox.

---

## 🚀 Step-by-Step Installation

### Step 1: Get the Project Files & Install Dependencies

First, you need to have the project files on your computer and install the necessary software libraries.

1.  **Unzip the Files**: Make sure all the project files you received are in a single folder on your computer (e.g., `C:\Projects\ShikshakX` or `~/dev/shikshakx`).
2.  **Open a Terminal**:
    *   **On Windows**: Open the Start Menu, type `cmd` or `powershell`, and press Enter.
    *   **On macOS/Linux**: Open the "Terminal" application.
3.  **Navigate to the Project Folder**: In your terminal, use the `cd` (change directory) command to go into the project folder.
    ```bash
    # Example for Windows
    cd C:\Projects\ShikshakX

    # Example for macOS/Linux
    cd ~/dev/shikshakx
    ```
4.  **Install Dependencies**: Run the following command. This will read the `package.json` file and download all the required libraries (like React, Firebase, etc.) into a `node_modules` folder. This might take a few minutes.
    ```bash
    npm install
    ```

### Step 2: Configure Firebase (The Most Important Step!)

The application uses Google Firebase for its database. **Mistakes in this step are the #1 cause of common errors**.

> ✨ **Good News:** To avoid any mandatory billing screens, this version of the app **does not use Firebase Storage**. You only need to set up Authentication and the Firestore Database.

1.  **Create a Firebase Project**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
    *   Click **"Add project"** and give it a name (e.g., "My ShikshakX App"). Follow the on-screen steps.

2.  **Create a Web App**:
    *   Inside your new Firebase project, you'll see an overview page. Click the **Web icon** (`</>`) to create a new web application.
    *   Give it a nickname (e.g., "ShikshakX Web") and click **"Register app"**.
    *   Firebase will show you a `firebaseConfig` object. **Copy this entire object.**

3.  **Add Your Config to the Code**:
    *   In your code editor, open the file: `src/services/firebase.ts`.
    *   You will see a placeholder `firebaseConfig` object. **Delete the entire placeholder object and paste your own config that you just copied.**

4.  **Set Up Firestore Database**:
    *   In the Firebase Console, go to **Build > Firestore Database** from the left menu.
    *   Click **"Create database"**.
    *   Choose to start in **Production mode**. Click Next.
    *   Choose a location for your database (choose the one closest to you). Click **Enable**.

5.  **Update Firestore Security Rules**:
    *   Go to **Build > Firestore Database > Rules** tab.
    *   Delete everything in the editor and replace it with this to allow read/write access during development:
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // This rule allows anyone to read or write to the database.
            // It is for DEVELOPMENT ONLY. Do not use in a real product.
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
        ```
    *   Click **Publish**.

6.  **Authorize Your Domain for Sign-In (Fix for "unauthorized-domain" error)**:
    *   For Google Sign-In to work, you must tell Firebase to trust your local development domain.
    *   In the Firebase Console, go to **Build > Authentication**.
    *   Click on the **Settings** tab.
    *   Select the **Authorized domains** sub-tab.
    *   Click **"Add domain"**.
    *   Enter `localhost` and click **Add**.
    > This step is essential. If you skip it, you will get an **`auth/unauthorized-domain`** error when you try to sign in.

### Step 3: Configure Google Gemini API (For the AI Tutor)

The AI Tutor on the "Q & A" page uses the Gemini API.

1.  **Get an API Key**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click **"Create API key"**. Copy the key.
2.  **Set the API Key**: This application platform automatically injects the necessary API key as an environment variable (`process.env.API_KEY`) when you run it. You do not need to create any `.env` files or modify the code for this step to work in this specific development environment.

### Step 4: Configure Google Calendar API (Optional)

This step enables syncing tasks from the app to your personal Google Calendar.

1.  **Go to Google Cloud Console**: Open the [Google Cloud Console](https://console.cloud.google.com/). Make sure the project selected at the top is the same one you are using for Firebase.
2.  **Enable the API**:
    *   Go to **APIs & Services > Library**.
    *   Search for **"Google Calendar API"** and click on it.
    *   Click the **Enable** button.
3.  **Configure OAuth Consent Screen (Required for Login)**:
    *   In the Google Cloud Console, go to **APIs & Services > OAuth consent screen**.
    *   Choose **External** for the User Type and click **Create**.
    *   Fill in the required fields: App name, User support email, and Developer contact information.
    *   Click **SAVE AND CONTINUE**. On the "Scopes" page, click **SAVE AND CONTINUE** again.
    *   On the "Test users" page, click **+ ADD USERS** and add the Google account(s) you will use to test the login.
    *   Click **SAVE AND CONTINUE** and then **BACK TO DASHBOARD**.
4.  **Create Credentials**:
    *   Go to **APIs & Services > Credentials**.
    *   **API Key**: Click **+ CREATE CREDENTIALS** and select **API Key**. Copy the key that is generated.
    *   **OAuth Client ID**: Click **+ CREATE CREDENTIALS** again and select **OAuth client ID**.
        *   Application type: **Web application**.
        *   Under **Authorized JavaScript origins**, click **+ ADD URI**. Enter `http://localhost:5173` (or whatever port your app runs on, with no trailing slash).
        *   Click **Create**. Copy the **Client ID**.
5.  **Add Keys to the Code**:
    *   Open the file `src/services/calendarClient.ts`.
    *   Replace `"YOUR_GOOGLE_API_KEY_HERE"` with the **API Key** you created.
    *   Replace `"YOUR_GOOGLE_CLIENT_ID_HERE"` with the **Client ID** you created.

### Step 5: Run the Application!

You're all set! Now, let's start the app.

1.  **Go back to your terminal**, which should still be in the project's root folder.
2.  Run the following command:
    ```bash
    npm run dev
    ```
3.  The terminal will show you a local URL, usually `http://localhost:5173`. Open this URL in your browser.
4.  **Important:** After changing your Firebase or Google Calendar keys, you must stop the server (press `Ctrl + C` in the terminal) and run `npm run dev` again.
5.  The first time you load the app, you will see a "Setting up..." screen. This is the app populating your new Firebase database with dummy data. After a few seconds, the main application interface will appear.

**Congratulations! ShikshakX is now running locally on your machine.**

---

## 🔍 Troubleshooting Common Issues

- **Error: "Missing or insufficient permissions"**:
  - This is **almost always a Firebase Rules issue**. Go back to **Step 2, Part 5** and make sure you have copied, pasted, and published the correct rules for Firestore.

- **Error: "auth/unauthorized-domain"**:
  - You missed **Step 2, Part 6**. Go back and add `localhost` to your **Authorized domains** in the Firebase Authentication settings.

- **My data (tasks, notes) disappears when I refresh the page**:
  - This is also a **Firebase Rules** issue. The app can't save data permanently without the correct permissions. Double-check your rules and your `firebaseConfig` in `src/services/firebase.ts`.

- **The "Connect Google Calendar" button doesn't work or shows an error**:
  - **Re-read Step 4 very carefully**. The most common errors are:
    1.  **Forgetting the OAuth Consent Screen**: You must configure it and add your email as a test user.
    2.  **Incorrect "Authorized JavaScript origins"**: Make sure the URL (`http://localhost:5173`) in your Google Cloud Client ID settings exactly matches the URL in your browser, with no extra slashes.
    3.  **Typo in Keys**: Double-check that you have correctly pasted your API Key and Client ID in `src/services/calendarClient.ts`.

- **AI Tutor says "not configured"**:
  - This means the Gemini API key is not being provided by the environment. On this platform, this should be handled automatically. If you are running this project elsewhere, you will need to set up an environment variable named `API_KEY`.