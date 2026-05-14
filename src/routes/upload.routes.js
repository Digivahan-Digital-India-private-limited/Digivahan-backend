const express = require('express');
const router = express.Router();

const { upload, uploadImage } = require('../controllers/upload.controller');
const { authenticateToken } = require("../middleware/auth.js");

// POST image upload
router.post('/api/v1/upload/image', authenticateToken, upload.single('image'), uploadImage);

module.exports = router;
