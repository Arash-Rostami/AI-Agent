import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {generateToken} from '../utils/authManager.js';
import {JWT_SECRET, NODE_ENV, uploadDir, SIGNUP_SECRET} from '../config/index.js';
import avatarUpload from '../middleware/avatarUpload.js';
import {protect} from '../middleware/authGuard.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.post('/login', async (req, res) => {
    const {username, password} = req.body;

    try {
        const user = await User.findOne({username});

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Set cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({
                _id: user._id,
                username: user.username,
                token: token
            });
        } else {
            res.status(401).json({message: 'Invalid username or password'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

router.post('/signup', async (req, res) => {
    const {username, password, secretKey} = req.body;

    if (!SIGNUP_SECRET) {
        return res.status(500).json({message: 'Signup is currently disabled (Server Config Error)'});
    }

    if (secretKey !== SIGNUP_SECRET) {
        return res.status(403).json({message: 'Invalid Secret Key'});
    }

    try {
        const userExists = await User.findOne({username});

        if (userExists) {
            return res.status(400).json({message: 'User already exists'});
        }

        const user = await User.create({
            username,
            password,
            role: 'user' // Default role
        });

        if (user) {
            const token = generateToken(user._id);

            res.cookie('jwt', token, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.status(201).json({
                _id: user._id,
                username: user.username,
                token: token
            });
        } else {
            res.status(400).json({message: 'Invalid user data'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

router.post('/logout', (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({message: 'Logged out'});
});

router.get('/admin', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.json({username: null, canSync: false});

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('username avatar');

        if (!user) return res.json({username: null, canSync: false});

        const canSync = ['arash', 'siamak', 'ata'].includes(user.username.toLowerCase());
        res.json({username: user.username, avatar: user.avatar, canSync});
    } catch (error) {
        res.json({username: null, canSync: false});
    }
});

router.post('/change-password', protect, async (req, res) => {
    const {currentPassword, newPassword} = req.body;

    try {
        const user = await User.findById(req.user._id);

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.json({message: 'Password updated successfully'});
        } else {
            res.status(401).json({message: 'Invalid current password'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

router.post('/upload-avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({message: 'No file uploaded'});

        const user = await User.findById(req.user._id);
        if (user) {
            if (user.avatar) {
                const oldFilename = path.basename(user.avatar);
                const oldPath = path.join(uploadDir, oldFilename);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (err) => {
                        if (err) console.error('Failed to delete old avatar:', err);
                    });
                }
            }

            user.avatar = `/assets/img/avatars/${req.file.filename}`;
            await user.save();
            res.json({message: 'Avatar updated', avatar: user.avatar});
        } else {
            res.status(404).json({message: 'User not found'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

router.post('/remove-avatar', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            if (user.avatar) {
                const oldFilename = path.basename(user.avatar);
                const oldPath = path.join(uploadDir, oldFilename);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (err) => {
                        if (err) console.error('Failed to delete old avatar:', err);
                    });
                }
                user.avatar = null;
                await user.save();
            }
            res.json({message: 'Avatar removed', avatar: null});
        } else {
            res.status(404).json({message: 'User not found'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

export default router;
