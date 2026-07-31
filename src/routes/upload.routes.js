const express = require('express');
const router = express.Router();

const { upload, uploadImage } = require('../controllers/upload.controller');

// POST image uploade
router.post('/api/v1/upload/image', upload.single('image'), uploadImage);

module.exports = router;
