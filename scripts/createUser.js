import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const createUser = async () => {
    // Get args
    const args = process.argv.slice(2);
    const username = args[0];
    const password = args[1];

    if (!username || !password) {
        console.error('Usage: node scripts/createUser.js <username> <password>');
        process.exit(1);
    }

    await connectDB();

    try {
        const userExists = await User.findOne({ username });

        if (userExists) {
            console.log('User already exists');
            process.exit(0);
        }

        const user = await User.create({
            username,
            password
        });

        console.log(`User created: ${user.username}`);
        process.exit(0);
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
};

createUser();
