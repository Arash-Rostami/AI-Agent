import {syncDocuments} from '../utils/vectorManager.js';

export const syncVectors = async (req, res) => {
    try {
        const result = await syncDocuments();
        res.json({success: true, message: 'Vector database synced successfully', data: result});
    } catch (error) {
        console.error('Vector sync error:', error);
        res.status(500).json({success: false, error: error.message});
    }
};
