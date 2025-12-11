import express from 'express';
import User from '../models/User.js';
import {generateToken} from '../utils/authManager.js';
import {NODE_ENV} from '../config/index.js';

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

router.post('/logout', (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({message: 'Logged out'});
});

export default router;
