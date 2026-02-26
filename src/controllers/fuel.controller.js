// src/controllers/fuel.controller.js
const Fuel = require("../models/fuel.model");

/**
 * POST /api/v1/fuel/prices
 */
exports.upsertStates = async (req, res) => {
  try {
    const { states } = req.body;
    if (!states || typeof states !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid states" });
    }

    const ops = Object.entries(states).map(([state, prices]) => ({
      updateOne: {
        filter: { state },
        update: {
          $set: {
            cng: prices.cng ?? null,
            petrol: prices.petrol,
            diesel: prices.diesel,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await Fuel.bulkWrite(ops);

    return res.json({ success: true, message: "Fuel prices updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * GET /api/v1/fuel/states?order=asc
 */
// GET /api/v1/fuel/states?order=asc
exports.listStatesAlphabetical = async (req, res) => {
  try {
    const order = req.query.order === "desc" ? -1 : 1;

    // 🔥 Fetch all states (DB sorting = fast)
    const statesDocs = await Fuel.find({})
      .select("state cng petrol diesel updatedAt -_id")
      .sort({ state: order })
      .lean();

    if (!statesDocs || statesDocs.length === 0) {
      return res.json({
        success: true,
        data: {
          updatedAt: null,
          states: [],
        },
      });
    }

    // 🔹 latest updatedAt (max date)
    const latestUpdatedAt = statesDocs.reduce(
      (latest, item) =>
        !latest || item.updatedAt > latest ? item.updatedAt : latest,
      null
    );

    // 🔹 reshape for frontend
    const states = statesDocs.map((doc) => ({
      state: doc.state,
      cng: doc.cng ?? 0,
      petrol: doc.petrol,
      diesel: doc.diesel,
    }));

    return res.json({
      success: true,
      data: {
        updatedAt: latestUpdatedAt,
        states,
      },
    });
  } catch (error) {
    console.error("listStatesAlphabetical error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

