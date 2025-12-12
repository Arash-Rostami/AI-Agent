# 🤖 Enterprise AI Assistant

> **Intelligent, Secure, and Connected.**
> A production-ready AI agent designed for enterprise integration, featuring real-time web intelligence, deep business system connectivity, and military-grade security protocols.

## 🧠 Core Capabilities

### 1. Advanced Cognitive Engine
Built to understand context, nuance, and intent.
*   **Bilingual Fluency:** Native-grade understanding of **English** and **Farsi**.
*   **Deep Context:** Remembers conversation history to provide coherent, multi-turn assistance.
*   **Adaptive Reasoning:** Automatically selects the best underlying model logic to handle complex queries, from creative writing to analytical reasoning.

### 2. Live Web Intelligence
Breaking the knowledge cutoff.
*   **Real-Time Search:** Accesses live web data for up-to-the-minute answers on news, markets, and events.
*   **Verified Citations:** Every claim is backed by clickable source links, ensuring trust and traceability.
*   **Smart Synthesis:** Reads multiple sources to construct a comprehensive answer rather than just listing links.

### 3. Enterprise Integrations
More than just a chatbot—it's a business tool.
*   **BMS Connector:** Securely queries your **Business Management System (BMS)** to retrieve real-time data on contracts, shipments, and payments.
*   **Corporate Knowledge Base:** Ingests and references internal policy documents (e.g., Persol Services) to answer employee queries with 100% accuracy.
*   **Tool Ecosystem:** Includes built-in utilities for **Weather** forecasting and **Time/Date** awareness.

### 4. Secure & Embeddable Architecture
Designed for safe deployment in public or private environments.
*   **Restricted Mode:** Automatically locks down sensitive tools (like BMS access) when embedded in external websites (via iframe), ensuring data safety.
*   **Granular Permissions:** Web Search can be selectively enabled even in restricted environments while keeping internal data locked.
*   **Session Guard:** Uses IP-based session binding and persistent user states to prevent unauthorized access.

---

## 🛠 Technical Architecture

*   **Runtime:** Node.js (v18+)
*   **Database:** MongoDB (Persistent Sessions & User Auth)
*   **Security:** JWT Authentication, IP-based Session Binding, API Key Rotation.
*   **Resilience:** Multi-provider fallback system ensuring high availability.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (Local or Atlas)

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

# --- Service URLs (Defaults usually work) ---
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

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

## 🛡️ Security Features

*   **Iframe Protection:** The `frameGuard` middleware validates `Referer` headers to prevent unauthorized embedding.
*   **Key Rotation:** The `KeySessionManager` automatically rotates API keys (Gemini, Groq, etc.) to handle rate limits and ensure uptime.
*   **Sanitized Inputs:** All inputs are validated against injection attacks before processing.
*   **Access Control:** Strict separation between "Public" tools (Web Search, Weather) and "Private" tools (BMS, Internal Docs).

---

*Built for sophisticated enterprise workflows.*
