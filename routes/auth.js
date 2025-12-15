import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {generateToken} from '../utils/authManager.js';
import {NODE_ENV, JWT_SECRET} from '../config/index.js';

const router = express.Router();

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.json({username: null, canSync: false});

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('username'); // minimal query

        if (!user) return res.json({username: null, canSync: false});

        const canSync = ['arash', 'siamak', 'ata'].includes(user.username.toLowerCase());
        res.json({username: user.username, canSync});
    } catch (error) {
        res.json({username: null, canSync: false});
    }
});

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

router.post('/logout', (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({message: 'Logged out'});
});

export default router;
