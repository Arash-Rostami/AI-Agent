import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {uploadDir} from "../config/index.js";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive: true});


const storage = multer.diskStorage({
    destination: function (req, file, callBack) {callBack(null, uploadDir)},
    filename: function (req, file, callBack) {
        const userId = req.user ? req.user._id.toString() : 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callBack(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, callBack) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) return callBack(new Error('Only image files are allowed!'), false);

    callBack(null, true);
};

const avatarUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {fileSize: 3 * 1024 * 1024} // upto 3MB size
});

export default avatarUpload;
