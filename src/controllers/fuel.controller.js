// src/controllers/fuel.controller.js
const Fuel = require('../models/fuel.model');

/**
 * POST /api/v1/fuel/prices
 */
exports.upsertStates = async (req, res) => {
  try {
    const { states } = req.body;
    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing "states" object' });
    }

    const setObj = {};
    for (const [stateName, priceObj] of Object.entries(states)) {
      if (!priceObj || typeof priceObj !== 'object') continue;
      const cng = Number(priceObj.cng);
      const petrol = Number(priceObj.petrol);
      const diesel = Number(priceObj.diesel);
      if (Number.isNaN(cng) || Number.isNaN(petrol) || Number.isNaN(diesel)) {
        return res.status(422).json({ success: false, message: `Invalid prices for state "${stateName}"` });
      }
      setObj[`states.${stateName}`] = { cng, petrol, diesel };
    }

    setObj['updatedAt'] = new Date();

    const doc = await Fuel.findOneAndUpdate(
      {},
      { $set: setObj },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean().exec();

    // hide _id if you don't want to return it
    if (doc && doc._id) delete doc._id;

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('upsertStates error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/v1/fuel/states?order=asc
 */
exports.listStatesAlphabetical = async (req, res) => {
    try {
      const order = (req.query.order || 'asc').toLowerCase();
      const sortFactor = order === 'desc' ? -1 : 1;
  
      const doc = await Fuel.findOne().lean().exec();
      if (!doc || !doc.states) return res.json({ success: true, data: { updatedAt: doc?.updatedAt || null, states: [] } });
  
      const statesObj = doc.states;
      const arr = Object.entries(statesObj).map(([stateName, prices]) => ({
        state: stateName,
        cng: prices?.cng ?? null,
        petrol: prices?.petrol ?? null,
        diesel: prices?.diesel ?? null
      }));
  
      arr.sort((a, b) => sortFactor * a.state.localeCompare(b.state, 'en', { sensitivity: 'base' }));
  
      return res.json({
        success: true,
        data: {
          updatedAt: doc.updatedAt || null,
          states: arr
        }
      });
    } catch (err) {
      console.error('listStatesAlphabetical error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
