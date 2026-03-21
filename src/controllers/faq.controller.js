const FAQ = require("../models/faq.model");


// 1️⃣ ADD FAQ
exports.addFAQ = async (req, res) => {
  try {
    const { type, question, answer } = req.body;

    if (!type || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: "type, question and answer required"
      });
    }

    const faq = new FAQ({ type, question, answer });
    await faq.save();

    return res.status(201).json({
      success: true,
      message: "FAQ added successfully",
      data: faq
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


// 2️⃣ GET FAQ LIST (WITH OPTIONAL TYPE)

exports.getFAQ = async (req, res) => {
  try {

    const { type } = req.query;

    let filter = {};

    if (type) {
      filter.type = type;
    }

    const faqList = await FAQ.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: faqList.length,
      data: faqList
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


// 3️⃣ DELETE FAQ

exports.deleteFAQ = async (req, res) => {

  try {

    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

};


// 4️⃣ UPDATE FAQ

exports.updateFAQ = async (req, res) => {

  try {

    const { id } = req.params;

    const { type, question, answer } = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      id,
      { type, question, answer },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

};