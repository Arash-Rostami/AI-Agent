# AI Agent Microservice Documentation

## 📖 Overview

The **AI Agent Microservice** is a robust, full-stack Node.js application designed to function as an intelligent assistant. It leverages Google's Gemini API (and optionally Groq or OpenRouter) to provide conversational capabilities, including context-aware chat, tool execution (weather, web search, business info), and a secure restricted mode for embedded environments.

## ✨ Features

*   **Multi-Provider Support:** Primarily powered by Google Gemini, with optional support for Groq and OpenRouter.
*   **Context-Aware Conversations:** Maintains conversation history per session to provide relevant answers.
*   **Tool Integration:**
    *   **Web Search:** Retrieves real-time information and sources using DuckDuckGo.
    *   **Weather:** Provides current weather updates for specified locations using OpenWeatherMap.
    *   **Business Info:** Retrieves static business documentation/policies (Persol).
*   **Restricted Mode:** A security feature for iframe embeddings that limits tool access based on the Referer header.
    *   By default, all tools are disabled in Restricted Mode.
    *   **Web Search Exception:** Web search can be selectively enabled in Restricted Mode via the `useWebSearch` flag.
*   **Simple API:** A lightweight endpoint for basic text-in/text-out interactions.

## 🛠️ Technical Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **AI Models:** Google Gemini 2.0 Flash (default), Groq, OpenRouter
*   **Utilities:** Axios, dotenv, nodemon (for dev)

## 🚀 Installation & Setup

### Prerequisites

*   Node.js (v18+ recommended)
*   npm or yarn

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and populate it with the necessary API keys and settings:

```ini
# Server Configuration
PORT=3000
SITE_URL=https://your-site-url.com
SITE_NAME="AI Assistant"
ALLOWED_ORIGINS=https://trusted-site.com,https://another-trusted-site.com

# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

# Weather Tool (OpenWeatherMap)
WEATHER_API_KEY=your_weather_api_key

# Optional Providers
GROK_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
```

### 4. Start the Application

**Development Mode (with auto-restart):**
```bash
npm run auto
```

**Production Mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the configured `PORT`).

## 📡 API Reference

### 1. Chat Interaction (`POST /ask`)
The primary endpoint for the conversational agent.

*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "message": "What is the weather in Tokyo?",
      "useWebSearch": true
    }
    ```
*   **Response:**
    ```json
    {
      "reply": "The current weather in Tokyo is...",
      "sources": [ ... ]
    }
    ```

### 2. Initial Prompt (`GET /initial-prompt`)
Fetches a greeting message based on the current mode (Standard or Restricted).

### 3. Clear Chat (`POST /clear-chat`)
Clears the conversation history for the current session.

### 4. Simple API (`POST /api/`)
A simplified endpoint that accepts text, JSON, or form data and returns a raw text response from Gemini. useful for simple integrations.

*   **Body:** Raw text or `{"message": "..."}`
*   **Response:** `{"response": "..."}`

### 5. Alternative Providers
*   `POST /ask-groq`: Chat using the Groq API.
*   `POST /ask-openrouter`: Chat using the OpenRouter API.

## 🔒 Restricted Mode

Restricted Mode is automatically activated when the request's `Referer` or `X-Frame-Referer` header matches one of the `ALLOWED_ORIGINS`.

*   **Behavior:**
    *   The system prompt is simplified.
    *   **All tools are disabled** by default.
    *   **Exception:** If the client sends `"useWebSearch": true` in the `/ask` request body, the **Web Search** tool is enabled, and the full system prompt is restored to ensure high-quality answers with citations.

## 📂 Project Structure

```
├── config/             # Configuration and environment variables
├── middleware/         # Express middleware (Auth, Restricted Mode, Error Handling)
├── routes/             # API route definitions
├── services/           # Logic for AI providers (Gemini, Groq, etc.)
├── tools/              # Tool definitions and implementations
│   ├── documentReader/ # Business info tool
│   ├── weather/        # Weather tool
│   └── webSearch/      # Web search tool
├── utils/              # Helper functions
├── public/             # Static assets
├── app.js              # Application entry point
└── package.json        # Dependencies and scripts
```
