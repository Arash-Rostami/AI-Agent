🤖 Gemini AI Agent — Your Smart Assistant Starter Kit
A minimal, full-stack Node.js agent powered by Google's Gemini API. Includes chat history, dynamic routing, error handling, and tool integration patterns — built for devs who want to go beyond "Hello, world" with real AI workflows.


## Steps to Add This to Your README.md

1. **Header Section**
   Copy the project title, description, and horizontal rule (`---`).

2. **Setup & Configuration**
   Paste the “⚙️ Setup and Configuration” section, including the environment‑variable instructions.

3. **Environment Variables Block**
   Insert the fenced code block for `.env`, replacing placeholders with your actual keys.

4. **API Keys Instructions**
   Copy the sub‑lists explaining how to get each API key.

5. **Installation & Running**
   Add the installation commands and instructions for running with `nodemon`.

6. **Emoji and Formatting**
   Emojis (e.g. `🤖`, `⚙️`, `🚨`) are just Unicode characters—GitHub will render them fine.

---

## Full Markdown Text

````markdown
# 🤖 Gemini AI Agent — Your Smart Assistant Starter Kit

A minimal, full-stack Node.js agent powered by Google's Gemini API. It includes chat history, dynamic routing, robust error handling, and practical tool integration patterns. This project is built for developers who want to go beyond "Hello, world" and dive into real AI workflows.

---

## ⚙️ Setup and Configuration

To get this AI Agent up and running on your local machine, you'll need to set up a few environment variables for API keys and configuration.

### 1. Environment Variables (`.env` file)

This project relies on environment variables to manage sensitive API keys and other settings. You'll need to create a new file named `.env` in the **root** of your project (the same directory where `package.json` and `app.js` are located).

Populate your `.env` file with the following:

```dotenv
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
WEATHER_API_KEY=YOUR_WEATHER_API_KEY_HERE
PORT=3000
````

🚨 **Important:** Remember to replace the placeholder values (`YOUR_GEMINI_API_KEY_HERE`, `YOUR_WEATHER_API_KEY_HERE`) with your actual API keys.

---

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

