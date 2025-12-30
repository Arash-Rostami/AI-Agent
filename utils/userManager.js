import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

const {default: User} = await import('../models/User.js');
const {default: connectDB} = await import('../config/db.js');

const setDefaultValues = (data) => {
    return {
        username: data.username || null,
        password: data.password || null,
        role: data.role || 'user',
        avatar: data.avatar || null,
    };
};

const createUser = async () => {
    const [, username, password, role, avatar] = process.argv.slice(2);
    if (!username || !password) {
        console.error('Usage: node utils/userManager.js create <username> <password> [role] [avatar]');
        process.exit(1);
    }
    await connectDB();
    try {
        if (await User.findOne({username})) {
            console.log('User already exists');
            process.exit(0);
        }
        const userData = setDefaultValues({username, password, role, avatar});
        const user = await User.create(userData);
        console.log(`User created: ${user.username}`);
        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }
};

const updateUser = async () => {
    const [, username, ...args] = process.argv.slice(2);
    if (!username || args.length === 0 || args.length % 2 !== 0) {
        console.error('Usage: node utils/userManager.js update <username> <field> <value> [field] [value]...');
        process.exit(1);
    }
    await connectDB();
    try {
        const user = await User.findOne({username});
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        for (let i = 0; i < args.length; i += 2) {
            user[args[i]] = args[i + 1];
        }
        await user.save();
        console.log(`User updated: ${user.username}`);
        process.exit(0);
    } catch (err) {
        console.error('Error updating user:', err);
        process.exit(1);
    }
};

const deleteUser = async () => {
    const [, username] = process.argv.slice(2);
    if (!username) {
        console.error('Usage: node utils/userManager.js delete <username>');
        process.exit(1);
    }
    await connectDB();
    try {
        const user = await User.findOneAndDelete({username});
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        console.log(`User deleted: ${user.username}`);
        process.exit(0);
    } catch (err) {
        console.error('Error deleting user:', err);
        process.exit(1);
    }
};

const userManager = () => {
    const [action] = process.argv.slice(2);
    if (!action) {
        console.error('Usage: node utils/userManager.js <create|update|delete>');
        process.exit(1);
    }
    switch (action) {
        case 'create':
            createUser();
            break;
        case 'update':
            updateUser();
            break;
        case 'delete':
            deleteUser();
            break;
        default:
            console.error('Unknown action. Use create, update, or delete.');
            process.exit(1);
    }
};

/**
 * Usage:
 * node utils/userManager.js create <username> <password> [role] [avatar]
 * node utils/userManager.js update <username> <field> <value> [field] [value]...
 * node utils/userManager.js delete <username>
 */
userManager();