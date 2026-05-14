const express = require('express');
const router = express.Router();

const { deleteImage } = require('../controllers/deleteImage.controller');
const { authenticateToken } = require("../middleware/auth.js");

// DELETE image
router.delete('/api/v1/upload/image', authenticateToken, deleteImage);

module.exports = router;
