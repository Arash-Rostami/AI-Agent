# 🤖 Express.js AI Orchestration Engine
> **The Neural Cortex for Enterprise Intelligence.**
> A centralized, production-ready AI hub designed to unify cutting-edge models, automate complex workflows, and serve as the intelligent backbone for modern digital ecosystems.

## 🌟 Visionary Product Showcase

### Objective
This is not just a chatbot; it is a **Centralized AI Intelligence Hub**. It connects to multiple LLMs and integrates with various external applications to act as both a standalone assistant and a background AI agent for other systems.

### 🧠 Core Capabilities (The "Wow" Factor)

#### 1. Multi-LLM Neural Routing
*   **Intelligence Routing:** A 4-option model selector — **Gemini** (default: text/tools via ArvanCloud-hosted Gemini, vision via native Gemini), **GPT** (ArvanCloud GPT-OSS-120B), **Ollama** (Groq-hosted Llama 3.1 8B Instant), and **Gemini Smart** (pure native Gemini, disabled until a premium key is configured). Content-based dispatch, no fallback loop.
*   **Thinking Mode:** Activates deep reasoning capabilities (ArvanCloud Gemini-3-Flash thinking model) for solving multi-step logic problems.
*   **Resilient Architecture:** The Gemini option keeps working even when the free-tier native key is quota-exhausted, because text/tools route to ArvanCloud-hosted Gemini (only vision needs the native key).

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
*   **ArvanCloud Integration:** Secure, localized routing to **GPT-OSS-120B**, plus an ArvanCloud-hosted Gemini model used as an automatic fallback when Gemini's free-tier keys are unavailable.
*   **Groq:** High-speed inference using **Llama 3.1 8B Instant** for cost-effective scaling.
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
*   **Voice Input:** Record and send audio messages directly to Gemini.
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
    *   `RestrictedMode` (Context-aware tool blocking)
*   **Architecture Pattern:** Controller-Service-Repository pattern with "Memory-First" fallbacks for high availability.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (Local or Atlas)
*   API Keys (Gemini, ArvanCloud, Groq)

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo-name>

# Install dependencies
npm install
```

### 2. Configuration
Create a `.env` file in the root directory. **Required** (app exits at boot without these):

```env
# --- Required (boot fails if missing) ---
GEMINI_API_KEY=your_google_gemini_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
MONGO_URI=mongodb://localhost:27017/ai_agent
```

**Required for full functionality** (app boots but the feature is disabled without them):

```env
# --- Server Config ---
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key          # ⚠ has a hardcoded fallback if unset — always set it in prod
SITE_URL=https://your-domain.com
SIGNUP_SECRET=your_secure_signup_key_here     # required for the /signup endpoint
ALLOWED_ORIGINS=https://app1.example.com,https://app2.example.com  # CSV of external sites permitted to embed this app (iframe/restricted mode). Do NOT list this app's own URL here.

# --- LLM Provider Keys & URLs (ArvanCloud is the Gemini option's text/tools backend today) ---
GROK_API_KEY=your_groq_key                                       # Ollama option (/ask-groq)
ARVANCLOUD_API_KEY=your_arvancloud_key
ARVANCLOUD_CHATGPT_URL=https://arvancloudai.ir/gateway/models/GPT-OSS-120B/.../v1/chat/completions
ARVANCLOUD_GEMINI_URL=https://arvancloudai.ir/gateway/models/Gemini-3.1-Flash-Lite-Preview/.../v1/chat/completions
ARVANCLOUD_THINKING_URL=https://arvancloudai.ir/gateway/models/Gemini-3-Flash-Preview/.../v1/chat/completions
ARVANCLOUD_EMBEDDING_URL=https://arvancloudai.ir/gateway/models/Embedding-3-Large/.../v1/embeddings  # BMS RAG vector search

# --- Tools ---
WEATHER_API_KEY=your_openweathermap_key
AI_SERVICE_SECRET=your_bms_backend_secret
BMS_API_URL=https://example.io/ai/query

# --- Email (SMTP) ---
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM='AI Assistant <you@example.com>'
```

> **Gemini key tiers:** `GEMINI_API_KEY` is the **native** Google key — used today only for image/vision on the Gemini option, the `Gemini Smart` option, and the stateless `/api/` endpoint. Text and tool-calling on the Gemini option route to **ArvanCloud-hosted Gemini** (`ARVANCLOUD_GEMINI_URL`), so the app keeps working on the default path even when the free-tier native key is quota-exhausted. The free tier currently 429s on vision/Smart until a **premium** key replaces `GEMINI_API_KEY`; until then `Gemini Smart` is disabled in the UI.

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

### 5. Testing

The suite uses Node's built-in `node:test` runner (no extra deps) and exercises a live server + real providers over HTTP.

```bash
npm test                 # boot server, run suite, tear down
npm test -- --email      # also run the real-SMTP email tests (off by default)
```

The orchestrator (`test/run.js`) starts `node app.js`, waits for readiness, runs `node --test test/` (serialized, `--test-concurrency=1`), then kills the server. If a server is already reachable at `TEST_BASE` (default `http://localhost:3000`), it reuses it instead of booting one.

| File | Covers |
|---|---|
| `test/01-auth.test.js` | signup/login, `/auth/admin`, protect-gate redirect, change-password, avatar upload/remove |
| `test/02-services.test.js` | ArvanCloud (GPT/Gemini/Thinking), `askGemini` hybrid dispatch, `/initial-prompt`, `/ask`, `/ask-arvan` tool-calling |
| `test/03-tools.test.js` | weather, forecast, air quality, time, web search (sources), web crawler, business-info doc, sendEmail |
| `test/04-modes.test.js` | iframe restricted mode, BMS (`searchBmsDatabase`), ETEQ (web search + non-persistence) |
| `test/05-history-sessions.test.js` | `session_id` cookie, in-memory continuity, list/details, restore, clear, delete, email-history |

**Skipped by design (not failures):**
- **Groq / `/ask-groq` (Ollama option)** — `test.skip` to protect the Groq daily quota. The route and UI stay fully functional; exercise manually.
- **Vision (`/ask` + image), `/ask-smart` (Gemini Smart), `/api/` simpleApi** — `test.skip` because they hit the free-tier **native** Gemini key (429 today). They un-skip once a premium key replaces `GEMINI_API_KEY`.
- **`POST /api/vector/sync` (RAG rebuild)** — not run by default (destructive full-rebuild of the vector store); exercise manually when changing the RAG path.

**Notes**
- A 3s `afterEach` pause (`test/helpers.js` `pace`) keeps the suite from pressuring the LLM provider rate limit.
- Tests hit live external services (ArvanCloud, Groq, Gemini, OpenWeather, DDG web search, BMS API, SMTP). Failures may reflect upstream outages, quota, or local DNS issues — not just regressions. Check `test/.server.log` and the console evidence lines.
- First run creates `qa_*` users in MongoDB (no delete-user endpoint); later runs log them in.

| Var / flag | Purpose |
|---|---|
| `TEST_BASE=http://host:port` | Target an already-running server instead of booting one. |
| `TEST_SEND_EMAIL=1` or `--email` | Enable real-SMTP email tests (off by default — side-effecting). Recipient parsed from `EMAIL_FROM`. |
| `TEST_USER_PREFIX` | Prefix for `qa_*` test users (default `qa`). |
| `TEST_PASS` | Password for test users (default `Qa!Pass1_Test`). |

### 6. Production Deployment Notes

- **Set `JWT_SECRET` explicitly.** If unset, `config/index.js` falls back to a hardcoded `'default_secret_key_change_me'` and the app still boots — silently insecure. Always set it in production.
- **`ALLOWED_ORIGINS`** is a CSV of *external* sites permitted to embed this app (drives iframe/restricted mode). Do **not** list the app's own serving URL — browsers send `Referer: <current page>` on same-origin fetches, so listing your own URL misclassifies every direct visit as embedded and silently strips tools. BMS detection is hardcoded to `export.bmsflow.org`; ETEQ to `eteq.vercel.app`.
- **Single point of failure:** with the fallback cascade removed, the default **Gemini** option routes text + tool-calling through ArvanCloud (`ARVANCLOUD_GEMINI_URL`). An ArvanCloud outage takes the default chat path down; image/vision and `Gemini Smart` need the native `GEMINI_API_KEY`. Wire a premium native key (and un-skip + UI-enable `Gemini Smart`) to restore a second independent path.
- **Process model:** chat history is "memory-first" — an in-process `Map` with fire-and-forget Mongo persistence. A **process restart wipes the in-memory map**; non-ETEQ conversations survive in Mongo but don't auto-rehydrate (only the explicit restore flow brings one back). Run a single long-lived process, or add a shared store (Mongo/Redis) before horizontal scaling. ETEQ-mode conversations are never persisted and are lost on restart by design.
- **File uploads:** `/ask`, `/ask-groq`, `/ask-arvan` accept uploads via `multer.memoryStorage()` with no size cap — put a body-size limit at your reverse proxy (nginx `client_max_body_size`, etc.). Avatar uploads (`/auth/upload-avatar`) are disk-stored with a 3 MB cap and extension allowlist.
- **DNS:** the app resolves `arvancloudai.ir` and `generativelanguage.googleapis.com` per request. Use a stable resolver (e.g. `8.8.8.8` / `1.1.1.1`); a flaky system DNS will surface as intermittent "Sorry, I encountered an error" responses (the chat catch block).

---

## 🛡️ Security Features

*   **Restricted Mode:** Automatically locks down sensitive tools (Web Search, BMS) when embedded in external websites. Detects origin via `Referer` or `X-Frame-Referer` headers.
*   **Data Privacy:** "Restricted Mode" conversations are never stored in the vector database.
*   **Sanitized Inputs:** All inputs are validated against injection attacks before processing.
*   **Access Control:** Strict separation between "Public" tools (Web Search, Weather) and "Private" tools (BMS, Internal Docs).

---

*Built for sophisticated enterprise workflows.*
