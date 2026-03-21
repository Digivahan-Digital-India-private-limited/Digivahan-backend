const User = require("../models/User");

exports.checkUserByPhone = async (req, res) => {
    try {
  
      const { phoneNumber } = req.body;
  
      const user = await User.findOne({
        "basic_details.phone_number": phoneNumber,
      });
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not registered",
        });
      }
  
      // NAME LOGIC
      let name = "";
  
      if (user.public_details?.nick_name && user.public_details.nick_name.trim() !== "") {
        name = user.public_details.nick_name;
      } else {
        const firstName = user.basic_details?.first_name || "";
        const lastName = user.basic_details?.last_name || "";
        name = `${firstName} ${lastName}`.trim();
      }
  
      // PROFILE PIC LOGIC
      let profileUrl = "";
  
      if (user.public_details?.public_pic && user.public_details.public_pic.trim() !== "") {
        profileUrl = user.public_details.public_pic;
      } else {
        profileUrl = user.basic_details?.profile_pic || "";
      }
  
      return res.json({
        success: true,
        userId: user._id,
        name: name,
        profileUrl: profileUrl,
      });
  
    } catch (error) {
  
      return res.status(500).json({
        success: false,
        error: error.message,
      });
  
    }
  };