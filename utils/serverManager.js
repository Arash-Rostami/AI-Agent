import connectDB from "../config/db.js";
import {PORT} from "../config/index.js";


export const startServer = async (app) => {
    try {
        // await connectDB();
        app.listen(PORT, () => {
            console.log(`\n 📱 Server running successfully on http://localhost:${PORT}\n 🛑 Press Ctrl+C/Cmd+C to stop the server\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server due to database connection error:', error);
        process.exit(1);
    }
};