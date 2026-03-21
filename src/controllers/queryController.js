const UserQuery = require("../models/usersquery.model");

const submitQuery = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, query_type, query } = req.body;

    const newQuery = new UserQuery({
      first_name,
      last_name,
      email,
      phone,
      query_type,
      query,
    });

    const savedQuery = await newQuery.save();

    return res.status(201).json({
      success: true,
      message: "Query submitted successfully",
      data: savedQuery,
    });
  } catch (error) {
    console.error("Error submitting query:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while submitting query",
    });
  }
};

const getAllQuery = async (req, res) => {
  try {
    const queries = await UserQuery.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
    });
  } catch (error) {
    console.error("Error fetching queries:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching queries",
    });
  }
};

module.exports = { submitQuery, getAllQuery };
