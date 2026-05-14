const express = require('express');
const router = express.Router();

const { deleteImage } = require('../controllers/deleteImage.controller');

// DELETE image
router.delete('/api/v1/upload/image', deleteImage);

module.exports = router;
