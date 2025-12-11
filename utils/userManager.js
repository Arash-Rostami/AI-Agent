import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

const { default: User } = await import('../models/User.js');
const { default: connectDB } = await import('../config/db.js');

const createUser = async () => {
    const [username, password] = process.argv.slice(2);
    if (!username || !password) {
        console.error('Usage: node utils/userManager.js <username> <password>');
        process.exit(1);
    }

    await connectDB();

    try {
        if (await User.findOne({ username })) {
            console.log('User already exists');
            process.exit(0);
        }
        const user = await User.create({ username, password });
        console.log(`User created: ${user.username}`);
        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }
};

createUser();
