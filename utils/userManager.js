import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

const {default: User} = await import('../models/User.js');
const {default: connectDB} = await import('../config/db.js');

/**
 * Creates a new user in the database.
 * @param {Object} userData - The user data.
 * @param {string} userData.username - The username.
 * @param {string} userData.password - The password.
 * @param {string} [userData.role='user'] - The user role.
 * @param {string|null} [userData.avatar=null] - The avatar path.
 * @returns {Promise<Object>} The created user document.
 * @throws {Error} If user already exists or creation fails.
 */
export const createAppUser = async ({username, password, role = 'user', avatar = null}) => {
    // Ensure DB connection (idempotent)
    await connectDB();

    const existingUser = await User.findOne({username});
    if (existingUser) {
        throw new Error('User already exists');
    }

    // Mongoose schema handles hashing if implemented in pre-save,
    // otherwise we assume the model handles it or we pass raw password.
    // Based on existing code, it passes password directly, so model likely handles hashing.
    const user = await User.create({
        username,
        password,
        role: role || 'user',
        avatar: avatar || null
    });

    return user;
};

const createUser = async () => {
    const [, username, password, role, avatar] = process.argv.slice(2);
    if (!username || !password) {
        console.error('Usage: node utils/userManager.js create <username> <password> [role] [avatar]');
        process.exit(1);
    }

    try {
        const user = await createAppUser({username, password, role, avatar});
        console.log(`User created: ${user.username}`);
        process.exit(0);
    } catch (err) {
        if (err.message === 'User already exists') {
            console.log('User already exists');
            process.exit(0);
        }
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

// Check if running directly (CLI mode)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    userManager();
}
