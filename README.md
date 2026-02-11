# 🤖 Express.js AI Orchestration Engine
> **The Neural Cortex for Enterprise Intelligence.**
> A centralized, production-ready AI hub designed to unify cutting-edge models, automate complex workflows, and serve as the intelligent backbone for modern digital ecosystems.

---

## 🌟 Visionary Product Showcase

This is not just a chatbot; it is a **Centralized AI Intelligence Hub**. It connects to multiple LLMs and integrates with various external applications to act as both a standalone assistant and a background AI agent for other systems.

### 🧠 Core Capabilities

#### 1. Multi-LLM Neural Routing & Orchestration
*   **Intelligence Routing:** Dynamically switches between **Google Gemini 2.0 Flash** (Primary Reasoning), **ArvanCloud/GPT-4o** (Localized Compliance), and **Groq/Qwen** (High-Speed Inference) based on task complexity and availability.
*   **Thinking Mode:** Activates deep reasoning capabilities (Gemini 2.0 Flash Thinking) for solving multi-step logic problems that stump standard models.
*   **Resilient Architecture:** Automatic API key rotation via `KeySessionManager` and fallback strategies ensure 99.9% uptime even under heavy load.

#### 2. Unified Intelligence Gateway (Agentic Action)
*   **Cross-App Connectivity:** Acts as a headless brain for third-party apps via secure API endpoints (`/ask-groq`, `/ask-arvan`).
*   **Context-Aware Middleware:** Smartly detects execution context (Standalone, Iframe, BMS, ETEQ) and adjusts security protocols via `RestrictedMode`.
*   **Tool Ecosystem:** Native integration with **Real-time Web Search**, **Weather Intelligence**, **Time/Date**, and **Email Automation** allows the AI to *act* on information, not just generate text.

#### 3. Hyper-Personalized Contextual Awareness
*   **Memory-First Architecture:** Advanced `ConversationManager` maintains fluid dialogue across sessions, prioritizing in-memory speed with background MongoDB persistence.
*   **In-Memory Vector Engine:** Zero-latency RAG (Retrieval-Augmented Generation) system for instant access to internal policy documents and knowledge bases, initialized on startup for maximum performance.
*   **Lazy Sync:** Optimizes performance by keeping active sessions in memory and syncing to the database asynchronously.

#### 4. Enterprise-Grade AI Security
*   **Military-Grade Protection:** `frameGuard` and `authGuard` middleware protect against XSS, clickjacking, and unauthorized access.
*   **Audit Compliance:** Full logging of every interaction (`InteractionLog`), email (`EmailLog`), and system event.
*   **Role-Based Access Control:** Specialized modes (BMS, ETEQ) grant or restrict access to sensitive business data based on origin, ensuring data privacy and compliance.

---

## 🛠️ Dual-Mode Operation

### 1. The Elite Standalone Assistant
A fully responsive, Material Design 3 interface for direct human interaction.
*   **Voice Mode:** Speak naturally to the AI and receive audio responses.
*   **File Analysis:** Upload images or PDFs for instant OCR and analysis.
*   **History Management:** Searchable, exportable chat history with infinite scroll.
*   **Dark/Light Themes:** Automatic theme switching based on system preferences.

### 2. The Headless API Engine
A robust backend service that powers your internal tools. Send JSON requests to `/ask` endpoints and receive structured AI responses to automate customer support, data analysis, and content generation.

---

## ⚡ Outcome-Based Benefits
*   **Automate Complexity:** Replace manual workflows with intelligent agents that can browse the web, send emails, and query databases.
*   **Future-Proof:** Plug-and-play architecture allows instant swapping of underlying models (e.g., upgrading to Gemini 2.0) without changing application code.
*   **Superior Reasoning:** Leverages "Thinking Mode" and RAG to provide answers grounded in your specific business data, not just generic training data.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (Local or Atlas)
*   API Keys (Gemini, ArvanCloud, OpenRouter, Groq)

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo-name>

# Install dependencies
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:

```env
# --- Server Config ---
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ai_agent
JWT_SECRET=your_super_secret_jwt_key
SITE_URL=https://your-domain.com

# --- AI Model Keys (Primary & Fallbacks) ---
GEMINI_API_KEY_PREMIUM=your_google_gemini_key
GROK_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
ARVANCLOUD_API_KEY=your_arvancloud_key

# --- Service URLs & Tools ---
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
ARVANCLOUD_CHATGPT_URL=https://napi.arvancloud.ir/paas/v1/chat/completions
ARVANCLOUD_DEEPSEEK_URL=https://napi.arvancloud.ir/paas/v1/chat/completions
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
WEATHER_API_KEY=your_openweathermap_key
AI_SERVICE_SECRET=your_bms_backend_secret
BMS_API_URL=https://example.io/ai/query
```

### 3. Database & User Setup
The system uses MongoDB for user authentication. There is no public sign-up page. You must create users manually via the CLI.

**Create a new user:**
```bash
# Syntax: node utils/userManager.js <username> <password>
node utils/userManager.js admin securePassword123
```
*Note: This command connects to the MongoDB instance defined in your `.env` file.*

### 4. Running the Service

```bash
# Development Mode (Auto-restart with Nodemon)
npm run auto

# Production Mode
npm start
```

---

## 🛡️ Security Features

*   **Restricted Mode:** Automatically locks down sensitive tools (Web Search, BMS) when embedded in external websites. Detects origin via `Referer` or `X-Frame-Referer` headers.
*   **Data Privacy:** "Restricted Mode" conversations are never stored in the vector database.
*   **Key Rotation:** The `KeySessionManager` automatically rotates API keys to handle rate limits and ensure uptime.
*   **Sanitized Inputs:** All inputs are validated against injection attacks before processing.
*   **Access Control:** Strict separation between "Public" tools (Web Search, Weather) and "Private" tools (BMS, Internal Docs).

---

*Built for sophisticated enterprise workflows.*
