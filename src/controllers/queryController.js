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

const { transporter } = require("../utils/sendEmail.js");

const replyToQuery = async (req, res) => {
  try {
    const { email, replyText, customerName, queryId, customerQuestion } = req.body;

    if (!email || !replyText) {
      return res.status(400).json({
        success: false,
        message: "Email and reply text are required",
      });
    }

    let originalQueryText = customerQuestion || "";

    // If customerQuestion is not provided in body, try to fetch it from DB
    if (!originalQueryText && queryId) {
      const userQuery = await UserQuery.findById(queryId);
      if (userQuery) {
        originalQueryText = userQuery.query;
      }
    }

    const mailOptions = {
      from: `"Hasan" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Re: Your Query at Digivahan",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2196F3; margin-bottom: 20px;">DigiVahan Support</h2>
          
          ${originalQueryText ? `
          <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <strong style="color: #555; display: block; margin-bottom: 5px; font-size: 13px;">YOUR QUERY:</strong>
            <p style="margin: 0; color: #666; font-style: italic; white-space: pre-wrap; font-size: 14px;">"${originalQueryText}"</p>
          </div>
          ` : ''}

          <p>Hi ${customerName || "Customer"},</p>
          <p>Thank you for reaching out to us. Here is the response to your query:</p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; white-space: pre-wrap; border-radius: 4px;">
            ${replyText}
          </div>
          <p>If you have any further questions, feel free to reply to this email or contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.</p>
        </div>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [
        {
          filename: req.file.originalname,
          content: req.file.buffer,
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    // Mark the query as Completed
    if (queryId) {
      await UserQuery.findByIdAndUpdate(queryId, { status: "Completed" });
    } else {
      // Fallback: update the most recent Pending query for this email
      const pendingQuery = await UserQuery.findOne({ email, status: "Pending" }).sort({ createdAt: -1 });
      if (pendingQuery) {
        pendingQuery.status = "Completed";
        await pendingQuery.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
    });

  } catch (error) {
    console.error("Error sending query reply:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending the reply",
    });
  }
};

const deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuery = await UserQuery.findByIdAndDelete(id);

    if (!deletedQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting query:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the query",
    });
  }
};

const deleteMultipleQueries = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of query IDs",
      });
    }

    const result = await UserQuery.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} queries deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting multiple queries:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the queries",
    });
  }
};

module.exports = { submitQuery, getAllQuery, replyToQuery, deleteQuery, deleteMultipleQueries };
