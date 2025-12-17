# 🤖 Enterprise AI Assistant

> **Intelligent, Secure, and Connected.**
> A production-ready AI agent designed for enterprise integration, featuring real-time web intelligence, deep business system connectivity, and military-grade security protocols.

## 🧠 Core Capabilities

### 1. Multi-Model Cognitive Engine
Built to adapt to any task using the best-in-class models from leading providers.
*   **Google Gemini (Primary):** Powered by **Gemini 2.0 Flash** & **Gemini 1.5 Pro**. Supports native **Multimodal** input (Text, Images, PDFs) and **Function Calling**.
*   **ArvanCloud Integration:** Access to **GPT-4o** (Multimodal) and **DeepSeek V3** via secure, localized routing.
*   **OpenRouter & Groq:** High-speed inference using **Grok 4.1 Fast** and **Qwen 2.5** for cost-effective scaling.
*   **Context Aware:** Maintains deep conversation history with intelligent summarization and "sticky" sessions for seamless continuity.

### 2. Live Web Intelligence
Breaking the knowledge cutoff with Gemini's Grounding.
*   **Real-Time Search:** Accesses live web data for up-to-the-minute answers on news, markets, and events.
*   **Verified Citations:** Every claim is backed by clickable source links, ensuring trust and traceability.
*   **Smart Synthesis:** Reads multiple sources to construct a comprehensive answer rather than just listing links.

### 3. Enterprise Integrations & Tools
More than just a chatbot—it's a business tool.
*   **RAG (Retrieval-Augmented Generation):** Ingests internal policy documents and uses **Vector Search** to answer employee queries with 100% accuracy.
*   **BMS Connector:** Securely queries your **Business Management System (BMS)** to retrieve real-time data on contracts, shipments, and payments (Restricted Access).
*   **File Analysis:** Upload Images or PDFs for instant analysis, OCR, and data extraction (Gemini & GPT-4o only).
*   **Utilities:** Built-in tools for **Weather Forecasting**, **Time/Date** awareness, and **PDF Export** of chat history.

### 4. Secure & Embeddable Architecture
Designed for safe deployment in public or private environments.
*   **Restricted Mode:** Automatically locks down sensitive tools (Web Search, BMS) when embedded in external websites via **Referer Validation**.
*   **Session Guard:** Uses **IP-based** and **Sticky Session** binding to prevent unauthorized access and maintain state without cookies in iframes.
*   **JWT Authentication:** Secure admin access for managing vector knowledge bases and viewing logs.

---

## 🛠 Technical Architecture

*   **Runtime:** Node.js (v18+)
*   **Framework:** Express.js (Microservice Architecture)
*   **Database:** MongoDB (Persistent Sessions, Vector Store, User Auth)
*   **Frontend:** Vanilla JS (ES6 Modules) with **Google Material Design 3**.
*   **Security:**
    *   `frameGuard` Middleware (Iframe protection)
    *   `KeySessionManager` (API Key Rotation & Quota Management)
    *   Input Sanitization & MIME Type Validation

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (Local or Atlas)
*   API Keys (Gemini, ArvanCloud, etc.)

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo-name>

# Install dependencies
npm install
```

### 2. Configuration
Create a `.env` file in the root directory. You can copy the structure below:

```env
# --- Server Config ---
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ai_agent
JWT_SECRET=your_super_secret_jwt_key
SITE_URL=https://your-domain.com

# --- AI Model Keys (Primary & Fallbacks) ---
# The system automatically rotates keys for better reliability
GEMINI_API_KEY_PREMIUM=your_google_gemini_key
GROK_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
ARVANCLOUD_API_KEY=your_arvancloud_key

# --- Service URLs ---
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
ARVANCLOUD_CHATGPT_URL=https://napi.arvancloud.ir/paas/v1/chat/completions
ARVANCLOUD_DEEPSEEK_URL=https://napi.arvancloud.ir/paas/v1/chat/completions
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# --- Tool Integrations ---
WEATHER_API_KEY=your_openweathermap_key
AI_SERVICE_SECRET=your_bms_backend_secret
BMS_API_URL=https://example.io/ai/query
```

### 3. Database & User Setup
The system uses MongoDB for user authentication. You must create an initial user to log in.
Use the built-in utility script:

```bash
# Syntax: node utils/userManager.js <username> <password>
node utils/userManager.js admin securePassword123
```

### 4. Running the Service

```bash
# Development Mode (Auto-restart with Nodemon)
npm run auto

# Production Mode
npm start
```

---

## 🎨 UI Features

*   **Material Design 3:** Modern, responsive interface with Dark/Light mode support.
*   **Chat History:**
    *   Persistent sidebar history with "Sticky" session recall.
    *   **Export to PDF:** Download full conversation transcripts with one click.
    *   **Print View:** Clean, formatted print layout for archiving.
*   **Visual Attachments:** Drag-and-drop support for images and PDFs with client-side preview.
*   **Accessibility:** Font size controls and ARIA-compliant markup.

---

## 🛡️ Security Features

*   **Iframe Protection:** The `frameGuard` middleware validates `Referer` headers to prevent unauthorized embedding.
*   **Key Rotation:** The `KeySessionManager` automatically rotates API keys (Gemini, Groq, etc.) to handle rate limits and ensure uptime.
*   **Sanitized Inputs:** All inputs are validated against injection attacks before processing.
*   **Access Control:** Strict separation between "Public" tools (Web Search, Weather) and "Private" tools (BMS, Internal Docs).

---

*Built for sophisticated enterprise workflows.*
