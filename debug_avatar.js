import mongoose from 'mongoose';
import User from './models/User.js';
import { MONGO_URI, uploadDir } from './config/index.js';
import fs from 'fs';
import path from 'path';

async function checkAvatars() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        console.log('Upload Dir:', uploadDir);

        const users = await User.find({ avatar: { $ne: null } });
        console.log(`Found ${users.length} users with avatars.`);

        for (const user of users) {
            console.log(`\nUser: ${user.username}`);
            console.log(`Avatar DB Path: ${user.avatar}`);

            // user.avatar is like /assets/img/avatars/file.png
            // uploadDir is .../public/assets/img/avatars

            const filename = path.basename(user.avatar);
            const filePath = path.join(uploadDir, filename);

            if (fs.existsSync(filePath)) {
                console.log(`✅ File exists at: ${filePath}`);
                const stats = fs.statSync(filePath);
                console.log(`   Size: ${stats.size} bytes`);
            } else {
                console.log(`❌ File NOT FOUND at: ${filePath}`);
                // Check if it exists in old uploads just in case
                const oldPath = path.join(uploadDir, '../../uploads/avatars', filename);
                 if (fs.existsSync(oldPath)) {
                    console.log(`   (But found in old uploads: ${oldPath})`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAvatars();
