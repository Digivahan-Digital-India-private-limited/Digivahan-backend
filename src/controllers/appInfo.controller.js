const AppInfo = require("../models/appInfo.model");

// Ensure single appInfo document
async function getMainDoc() {
  let doc = await AppInfo.findOne();
  if (!doc) {
    doc = await AppInfo.create({});
  }
  return doc;
}

// UPDATE ANDROID VERSION
exports.updateAndroidVersion = async (req, res) => {
  try {
    const { version, notes } = req.body;

    const doc = await getMainDoc();

    doc.app_version.android = {
      version,
      notes,
      createdAt: doc.app_version.android?.createdAt || new Date(),
      updatedAt: new Date()
    };

    await doc.save();

    return res.json({ success: true, data: doc.app_version.android });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ANDROID VERSION
exports.getAndroidVersion = async (req, res) => {
    try {
      const doc = await getMainDoc();
      if (!doc || !doc.app_version?.android) {
        return res.status(404).json({ success: false, message: "No Android version found" });
      }
  
      return res.json({ success: true, data: doc.app_version.android });
    } catch (e) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };

// UPDATE IOS VERSION
exports.updateIOSVersion = async (req, res) => {
  try {
    const { version, notes } = req.body;

    const doc = await getMainDoc();

    doc.app_version.ios = {
      version,
      notes,
      createdAt: doc.app_version.ios?.createdAt || new Date(),
      updatedAt: new Date()
    };

    await doc.save();

    return res.json({ success: true, data: doc.app_version.ios });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

  // GET IOS VERSION
exports.getIOSVersion = async (req, res) => {
    try {
      const doc = await getMainDoc();
      if (!doc || !doc.app_version?.ios) {
        return res.status(404).json({ success: false, message: "No iOS version found" });
      }
  
      return res.json({ success: true, data: doc.app_version.ios });
    } catch (e) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };

// UPDATE PRIVACY POLICY
exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { policy } = req.body;
    const doc = await getMainDoc();

    doc.policy.privacy_policy = {
      policy,
      updatedAt: new Date()
    };

    await doc.save();

    return res.json({ success: true, data: doc.policy.privacy_policy });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
};
  // GET PRIVACY POLICY
  exports.getPrivacyPolicy = async (req, res) => {
    try {
      const doc = await getMainDoc();
      if (!doc || !doc.policy?.privacy_policy) {
        return res.status(404).json({ success: false, message: "No Privacy Policy found" });
      }
  
      return res.json({ success: true, data: doc.policy.privacy_policy });
    } catch (e) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };

// UPDATE TERMS & CONDITIONS
 exports.updateTermsCondition = async (req, res) => {
  try {
    const { terms_condition } = req.body;

    const doc = await getMainDoc();

    doc.policy.terms_condition = {
      terms_condition,
      updatedAt: new Date()
    };

    await doc.save();

    return res.json({ success: true, data: doc.policy.terms_condition });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
};
  
  // GET TERMS & CONDITIONS
  exports.getTermsCondition = async (req, res) => {
    try {
      const doc = await getMainDoc();
      if (!doc || !doc.policy?.terms_condition) {
        return res.status(404).json({ success: false, message: "No Terms & Condition found" });
      }
  
      return res.json({ success: true, data: doc.policy.terms_condition });
    } catch (e) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };

  

// 🔑 ADD / UPDATE RAZORPAY KEY
 exports.updateRazorpayKey = async (req, res) => {
  try {
    const { razorpay_key_id } = req.body;

    if (!razorpay_key_id) {
      return res.status(400).json({
        success: false,
        message: "razorpay_key_id is required",
      });
    }

    const updated = await AppInfo.findOneAndUpdate(
      {},
      {
        $set: {
          "api_key.razorpay_key_id": razorpay_key_id,
        },
      },
      {
        new: true,
        upsert: true, // ⭐ agar document nahi hai to create karega
      }
    );

    return res.json({
      success: true,
      message: "Razorpay key updated successfully",
      data: updated.api_key,
    });
  } catch (error) {
    console.error("Razorpay Key Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update Razorpay key",
    });
  }
};

exports.getAppInfo = async(req , res)=>{
 try {
    const doc = await AppInfo.findOne().lean().exec();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "No app info found",
      });
    }

    const now = new Date();

    const currentTime = now.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true, // AM/PM
    });

    return res.json({
      success: true,
      data: doc,
      currentDate: now.toISOString().split("T")[0], // YYYY-MM-DD
      currentTime, // 👈 "3:25 PM"
    });
  } catch (error) {
    console.error("getAllAppInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

