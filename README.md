🤖 Gemini AI Agent — Your Smart Assistant Starter Kit
A minimal, full-stack Node.js agent powered by Google's Gemini API. Includes chat history, dynamic routing, error handling, and tool integration patterns — built for devs who want to go beyond "Hello, world" with real AI workflows.


⚙️ Setup and Configuration
To get this AI Agent running, you'll need to set up a few environment variables for API keys and configuration.
1. Environment Variables (.env file)
This project uses environment variables to manage sensitive API keys and configuration settings. You'll need to create a `.env` file in the root of your project (the same directory as `package.json` and `src`).
Create a new file named .env and populate it with the following:

GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE

GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

WEATHER_API_KEY=YOUR_WEATHER_API_KEY_HERE

PORT=3000

Replace the placeholder values (YOUR_GEMINI_API_KEY_HERE, YOUR_WEATHER_API_KEY_HERE) with your actual keys.
How to get your API Keys:

 GOOGLE_API_KEY (for Gemini API):
    1.  Go to [Google AI Studio](https://www.google.com/search?q=https://ai.google.dev/studio).
    2.  Sign in with your Google Account.
    3.  In the left sidebar, click "Get API key" or "Get API key in Google AI Studio."
    4.  Click "Create API key" (or "Create API key in new project").
    5.  Copy the generated key and paste it into your .env file.
    
WEATHER_API_KEY (for Weather Tool):
    1.  You'll need an API key from a weather service. A popular free option is [OpenWeatherMap](https://openweathermap.com/).
    2.  Go to [openweathermap.org](https://openweathermap.org/) and sign up for a free account.
    3.  Once signed up, your API key (often called `APPID`) will be sent to your confirmation email or can be found on your [API keys page](https://home.openweathermap.org/api_keys) in your account dashboard.
    4.  Copy this key and paste it into your .env file.
    
 GEMINI_API_URL:
      * This is the default endpoint for the Gemini 2.0 Flash model. You typically won't need to change this unless you're targeting a different model or a specific deployment.
      
PORT:
      * This specifies the port your local server will run on (e.g., `http://localhost:3000`). You can change this if `3000` is already in use on your system.
      

2. Installation
Once you have your .env file configured, you can install the project dependencies: (npm install)

3. Running the Project
This project uses nodemon for automatic restarts during development.
First, ensure you have nodemon installed globally (if you don't already): (npm install -g nodemon)
 Then, to start the AI Agent:

    nodemon app.js

The server should now be running, and your AI Agent will be ready to process requests\! Changes you make to the code will automatically restart the server.
Good Luck 😉

