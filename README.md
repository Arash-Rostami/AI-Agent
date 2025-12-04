# 🤖 AI Agent — Your Smart Assistant Starter Kit

A minimal, full-stack Node.js agent powered by Google's Gemini API. Includes chat history, dynamic routing, error handling, and tool integration patterns — built for devs who want to go beyond "Hello, world" with real AI workflows.

## 📖 Introduction

This AI Agent Service is a specialized, intelligent assistant designed to provide accurate, context-aware support for users. It acts as a central brain that can be integrated into various platforms (like web chats or internal portals) to answer questions, perform tasks, and retrieve real-time information.

## 🚀 Key Capabilities

### 1. Intelligent Conversation
*   **Natural Language Understanding:** Capable of understanding and responding to complex queries in both **Farsi** and **English**.
*   **Context Retention:** Remembers previous parts of the conversation to maintain a natural, flowing dialogue without asking for repetition.
*   **Multi-Model Intelligence:** Powered by advanced AI models (Google Gemini Pro - Latest, ChatGPT, Grok) to ensure high-quality, human-like interactions.

### 2. Real-Time Web Search
*   **Live Information:** Unlike standard static AIs, this agent can browse the web to find the absolute latest news, facts, and data.
*   **Citations:** When answering with web data, it provides sources, ensuring transparency and trust.
*   **Selective Activation:** Users can toggle this feature on or off depending on their needs.

### 3. Integrated Tools
*   **Weather Updates:** Instantly checks current weather conditions for any location worldwide.
*   **Business Knowledge:** Has direct access to specific business documents (Persol services and policies) to answer company-related questions accurately.

### 4. Secure & Embedded Mode (New Update)
*   **Restricted Mode:** When embedded in third-party sites (via iframe), the agent automatically activates a secure mode based on the `Referer` header.
*   **Safety First:** In this mode, sensitive tools (like business document access) are **disabled** by default to prevent misuse.
*   **Selective Web Search:** Users or embedding applications can explicitly enable **Web Search** while remaining in Restricted Mode. This allows for safe, up-to-date information retrieval without exposing other sensitive internal tools.

## 🎯 Use Cases

*   **Customer Support:** Answering FAQs about company services and policies 24/7.
*   **Personal Assistant:** Helping users find quick facts, weather updates, or news summaries.
*   **Internal Knowledge Base:** Assisting employees by retrieving document-based information instantly.

---

## ⚙️ Setup and Configuration

To get this AI Agent up and running on your local machine, you'll need to set up a few environment variables for API keys and configuration.

### 1. Environment Variables (`.env` file)

This project relies on environment variables to manage sensitive API keys and other settings. You'll need to create a new file named `.env` in the **root** of your project (the same directory where `package.json` and `app.js` are located).

Populate your `.env` file with the following:


````markdown
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
WEATHER_API_KEY=YOUR_WEATHER_API_KEY_HERE
PORT=3000
````


---

🚨 **Important:** Remember to replace the placeholder values (`YOUR_GEMINI_API_KEY_HERE`, `YOUR_WEATHER_API_KEY_HERE`) with your actual API keys.

#### 🔑 How to Get Your API Keys:

* **`GOOGLE_API_KEY` (for Gemini API):**

    1. Go to [Google AI Studio](https://ai.google.dev/studio).

    2. Sign in with your Google Account.

    3. In the left sidebar, click **Get API key**.

    4. Click **Create API key**.

    5. Copy the generated key and paste it into your `.env` file.

  > **Security Note:** This key is essential for authenticating with the Gemini API. Keep it secure and **never** commit your `.env` file to public repositories.

* **`WEATHER_API_KEY` (for Weather Tool):**

    1. Sign up for a free account at [OpenWeatherMap](https://openweathermap.org/).
    2. After confirming your email, find your API key on your [API keys page](https://home.openweathermap.org/api_keys).
    3. Copy that key into your `.env` file.

* **`GEMINI_API_URL`:**

    * Specifies the default endpoint for the Gemini 2.0 Flash model. You usually won’t need to change this.

* **`PORT`:**

    * Defines the port number for your local server (e.g., `http://localhost:3000`). Change if `3000` is in use.

---

### 2. Installation

Once your `.env` file is set up, install dependencies:

```bash
npm install
# or
yarn install
```

---

### 3. Running the Project

We use `nodemon` for automatic restarts on code changes.

1. **Install `nodemon` globally (if you haven’t):**

   ```bash
   npm install -g nodemon
   # or
   yarn global add nodemon
   ```

   *Alternatively*, as a dev dependency:

   ```bash
   npm install --save-dev nodemon
   # or
   yarn add nodemon -D
   ```

2. **Start the AI Agent:**

   ```bash
   nodemon app.js
   ```

🚀 The server should now be running—any changes you save will auto-restart the service.

Good luck, and happy coding! 😉
