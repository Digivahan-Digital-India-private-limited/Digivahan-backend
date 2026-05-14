const express = require('express');
const router = express.Router();
const { authenticateTokenForAdmin } = require("../middleware/auth.js");
const { upsertStates, listStatesAlphabetical } = require('../controllers/fuel.controller');

// Upsert many states (create/update)
router.post("/api/v1/fuel/prices", authenticateTokenForAdmin, upsertStates);

// NEW: list states alphabetically (default asc). Use ?order=desc for reverse
router.get('/api/v1/fuel/states', listStatesAlphabetical);

module.exports = router;
