# 🤖 Express.js AI Orchestration Engine
> **The Neural Cortex for Enterprise Intelligence.**
> A centralized, production-ready AI hub designed to unify cutting-edge models, automate complex workflows, and serve as the intelligent backbone for modern digital ecosystems.

## 🌟 Visionary Product Showcase

### Objective
This is not just a chatbot; it is a **Centralized AI Intelligence Hub**. It connects to multiple LLMs and integrates with various external applications to act as both a standalone assistant and a background AI agent for other systems.

### 🧠 Core Capabilities (The "Wow" Factor)

#### 1. Multi-LLM Neural Routing
*   **Intelligence Routing:** Dynamically switches between **Google Gemini 2.0 Flash** (Primary Reasoning), **ArvanCloud/GPT-4o** (Localized Compliance), and **Groq/Qwen** (High-Speed Inference) based on task complexity and availability.
*   **Thinking Mode:** Activates deep reasoning capabilities (Gemini 2.0 Flash Thinking) for solving multi-step logic problems.
*   **Resilient Architecture:** Automatic API key rotation via `KeySessionManager` ensures 99.9% uptime.

#### 2. Unified Intelligence Gateway
*   **Cross-App Connectivity:** Acts as a headless brain for third-party apps via secure API endpoints (`/ask-groq`, `/ask-arvan`).
*   **Context-Aware Middleware:** Smartly detects execution context (Standalone, Iframe, BMS, ETEQ) and adjusts security protocols via `RestrictedMode`.
*   **Tool Ecosystem:** Native integration with **Real-time Web Search**, **Weather Intelligence**, **Time/Date**, and **Email Automation**.

#### 3. Hyper-Personalized Contextual Awareness
*   **Memory-First Architecture:** Advanced `ConversationManager` maintains fluid dialogue across sessions, prioritizing in-memory speed with background MongoDB persistence.
*   **In-Memory Vector Engine:** Zero-latency RAG (Retrieval-Augmented Generation) system for instant access to internal policy documents.

#### 4. Enterprise-Grade AI Security
*   **Military-Grade Protection:** `frameGuard` and `authGuard` middleware protect against XSS and unauthorized access.
*   **Role-Based Access Control:** Specialized modes (BMS, ETEQ) grant or restrict access to sensitive business data based on origin.

### 🛠️ Dual-Mode Operation

1.  **The Elite Standalone Assistant:** A fully responsive, Material Design 3 interface for direct human interaction with Voice Mode, File Analysis, and History Management.
2.  **The Headless API Engine:** A robust backend service that powers your internal tools via structured JSON requests.

### ⚡ Outcome-Based Benefits
*   **Automate Complexity:** Replace manual workflows with intelligent agents.
*   **Future-Proof:** Plug-and-play architecture allows instant swapping of underlying models.
*   **Superior Reasoning:** Leverages "Thinking Mode" and RAG for data-grounded answers.

---

# 🤖 Enterprise AI Assistant (Technical Documentation)

> **Intelligent, Secure, and Connected.**
> A production-ready AI agent designed for enterprise integration, featuring real-time web intelligence, deep business system connectivity, and military-grade security protocols.

---

## 🧠 Core Capabilities

### 1. Multi-Model Cognitive Engine
Built to adapt to any task using a federated architecture of best-in-class models.
*   **Google Gemini (Primary):** Powered by **Gemini 2.0 Flash** & **Gemini 1.5 Pro**. Supports native **Multimodal** input (Text, Images, Audio, PDFs) and **Function Calling**.
*   **ArvanCloud Integration:** Secure, localized routing to **GPT-4o** (Multimodal) and **DeepSeek V3**.
*   **OpenRouter & Groq:** High-speed inference using **Grok 4.1 Fast** (via OpenRouter) and **Qwen 2.5** (via Groq) for cost-effective scaling.
*   **Thinking Mode:** Activates **Gemini 2.0 Flash Thinking** for complex reasoning tasks. *Note: Limited daily usage applies to manage computational resources.*

### 2. Live Web Intelligence & Tools
Breaking the knowledge cutoff with advanced tools and grounding.
*   **Real-Time Search:** Accesses live web data for up-to-the-minute answers on news, markets, and events.
*   **Web Crawling:** Reads and summarizes content from specific user-provided URLs.
*   **Time Awareness:** Instantly provides current time across global timezones.
*   **Weather Intelligence:**
    *   **Current Conditions & Forecast:** Real-time updates and 5-day summaries.
    *   **Air Quality:** Detailed pollution metrics (AQI) for health-conscious decision-making.
*   **Verified Citations:** Every claim is backed by clickable source links.

### 3. Communication Hub
Seamlessly integrate AI insights into your workflow.
*   **Smart Email Tool:**
    *   **Context-Aware:** Auto-generates subjects and bodies based on the active conversation.
    *   **Formatting Engine:** Intelligent HTML generation with automatic **RTL/LTR detection** for mixed-language content.
    *   **Audit Logging:** Tracks every email sent for security and compliance.
    *   **Timezone Smart:** Headers reflect the user's local time.

### 4. Enterprise Integrations
More than just a chatbot—it's a business tool.
*   **High-Performance RAG:** Features an **In-Memory Vector Engine** for millisecond-latency searches across internal policy documents.
*   **BMS Connector:** Securely queries your **Business Management System (BMS)** to retrieve real-time data on contracts, shipments, and payments (Restricted Access).
*   **File Analysis:** Upload Images or PDFs for instant analysis, OCR, and data extraction.

### 5. Multimodal Interaction
*   **Voice Input:** Record and send audio messages directly to supported models (Gemini, GPT-4o).
*   **Audio Response:** AI generates natural speech playback for a hands-free experience.

---

## 🎨 UI & User Experience

*   **Google Material Design 3:** Modern, responsive interface with fluid animations and Dark/Light mode support.
*   **User Profile Management:**
    *   **Avatar System:** Upload/Remove profile pictures (synced across the UI).
    *   **Security:** Change passwords securely via the settings interface.
*   **History Management:**
    *   **Sidebar Navigation:** Slide-out history panel with infinite scroll.
    *   **Search & Filter:** Quickly find past conversations.
    *   **Export Options:** "Print to PDF" or formatted print views for archiving.
    *   **Sticky Sessions:** Smart session recovery for iframe users (via IP/Referer) even without cookies.
*   **Mobile Optimized:** Fully responsive layout with mobile-specific navigation and "Kebab" menus for compact access to tools.

---

## 🛠 Technical Architecture

*   **Runtime:** Node.js (v18+)
*   **Framework:** Express.js (Microservice Architecture)
*   **Database:** MongoDB (Persistent Sessions, User Auth, Audit Logs)
*   **Vector Engine:** Custom **In-Memory Vector Store** (initialized on startup from `documents/RAG`) for zero-latency context retrieval.
*   **Security:**
    *   `frameGuard` Middleware (Iframe protection)
    *   `KeySessionManager` (API Key Rotation & Quota Management)
    *   `RestrictedMode` (Context-aware tool blocking)
*   **Architecture Pattern:** Controller-Service-Repository pattern with "Memory-First" fallbacks for high availability.

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
SIGNUP_SECRET=your_secure_signup_key_here

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
The system uses MongoDB for user authentication. You can create users manually via the CLI or use the restricted API endpoint.

**Option A: CLI Creation (Recommended)**
```bash
# Syntax: node utils/userManager.js <username> <password>
node utils/userManager.js admin securePassword123
```
*Note: This command connects to the MongoDB instance defined in your `.env` file.*

**Option B: API Signup**
Send a `POST` request to `/signup` with a valid `secretKey` (must match `SIGNUP_SECRET` in `.env`):
```json
POST /signup
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword",
  "secretKey": "your_secure_signup_key_here"
}
```

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
