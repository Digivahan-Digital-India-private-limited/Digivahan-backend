// src/routes/fuel.routes.js
const express = require('express');
const router = express.Router();
const { upsertStates, listStatesAlphabetical } = require('../controllers/fuel.controller');

// Upsert many states (create/update)
router.post('/api/v1/fuel/prices', upsertStates);


// NEW: list states alphabetically (default asc). Use ?order=desc for reverse
router.get('/api/v1/fuel/states', listStatesAlphabetical);

module.exports = router;
