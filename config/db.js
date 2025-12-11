import mongoose from 'mongoose';
import { MONGO_URI } from './index.js';

const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in the environment variables.');
      process.exit(1);
    }
    // Mask URI for safety but allow visibility of host/port
    const maskedURI = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 Attempting to connect to MongoDB at: ${maskedURI}`);

    await mongoose.connect(MONGO_URI);
    console.log('🍃 MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
