const DeleteAccountRequest = require("../models/deleteAccountRequest.model");
const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");



// API 1 : RAISE DELETE ACCOUNT REQUEST

exports.raiseDeleteRequest = async (req,res)=>{

try{

const {
name,
phoneNumber,
email,
reason,
otherReason
} = req.body;


// check registered user
const user = await User.findOne({
"basic_details.phone_number":phoneNumber
});

if(!user){
  return res.status(400).json({
    success:false,
    message:"You are not registered user"
  });
}

// check if already requested
const existingRequest = await DeleteAccountRequest.findOne({
  user_id: user._id
});

if(existingRequest){
  return res.status(400).json({
    success:false,
    message:"You already submitted a request for deletion."
  });
}


const request = new DeleteAccountRequest({

user_id:user._id,
name,
phoneNumber,
email,
reason,
otherReason

});

await request.save();

res.status(201).json({

success:true,
message:"Delete account request submitted successfully",
data:request

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};




// API 2 : GET REQUEST LIST

exports.getDeleteRequests = async (req,res)=>{

try{

const {status} = req.query;

let filter={};

if(status){
filter.status=status;
}

const requests = await DeleteAccountRequest
.find(filter)
.sort({createdAt:-1});

res.json({

success:true,
total:requests.length,
data:requests

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};




// API 3 : UPDATE STATUS

exports.updateDeleteRequestStatus = async (req,res)=>{

try{

    const { id } = req.params;
    const { status, deletion_days } = req.body;

    const request = await DeleteAccountRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // If status is checked/closed, handle deletion scheduling
    if (["checked", "closed"].includes(status)) {
      const days = deletion_days !== undefined ? Number(deletion_days) : 30; // Default 30 days
      const user = await User.findById(request.user_id);
      
      if (user) {
        const isImmediate = days === 0;
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + days);

        // 🔍 Fetch all active QR codes assigned to user
        const assignedQRCodes = await QRAssignment.find({
          assigned_to: user._id,
          status: "active",
        }).select("qr_id");
        const qrList = assignedQRCodes.map((qr) => qr.qr_id);

        // Create/Update UserDeletion Record
        await UserDeletion.findOneAndUpdate(
          { user_id: user._id, status: "PENDING" },
          {
            user_id: user._id,
            deletion_type: isImmediate ? "IMMEDIATE" : "SCHEDULED",
            reason: `Admin Action: ${request.reason}${request.otherReason ? " - " + request.otherReason : ""}`,
            deletion_days: days * 24 * 60,
            deletion_date: deletionDate,
            status: isImmediate ? "COMPLETED" : "PENDING",
            qr_ids: qrList,
            qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
            isImmediate: isImmediate,
          },
          { upsert: true, new: true }
        );

        // Block QR Assignments
        await QRAssignment.updateMany(
          { assigned_to: user._id },
          { status: "inactive" }
        );

        if (isImmediate) {
          // ❌ Hard delete the user immediately
          await User.findByIdAndDelete(user._id);
        } else {
          // Update User Model for scheduled deletion
          user.deletion_date = deletionDate;
          user.account_status = "PENDING_DELETION";
          await user.save();
        }
      }
    }

    res.json({
      success: true,
      message: deletion_days !== undefined ? "Request status updated and deletion scheduled" : "Request status updated",
      data: request,
    });

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// API 4 : GET USER DELETION STATUS (For Frontend)
exports.getDeleteRequestStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if user has an active deletion scheduled
    const user = await User.findById(userId);
    if (user && user.account_status === "PENDING_DELETION" && user.deletion_date) {
      const now = new Date();
      const deletionDate = new Date(user.deletion_date);
      const timeDiff = deletionDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return res.json({
        success: true,
        data: {
          status: "SCHEDULED",
          daysLeft: daysLeft > 0 ? daysLeft : 0,
          deletionDate: user.deletion_date
        }
      });
    }

    // Check if user has any existing request
    const pendingRequest = await DeleteAccountRequest.findOne({
      user_id: userId
    }).sort({createdAt: -1});

    if (pendingRequest) {
      return res.json({
        success: true,
        data: {
          status: "IN_PROGRESS"
        }
      });
    }

    return res.json({
      success: true,
      data: {
        status: "NONE"
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// API 5 : DELETE/REJECT REQUEST (Admin)
exports.deleteRequestByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await DeleteAccountRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // Restore user if they were scheduled for deletion
    const user = await User.findById(request.user_id);
    if (user && user.account_status === "PENDING_DELETION") {
      user.account_status = "ACTIVE";
      user.deletion_date = null;
      await user.save();

      // Delete the UserDeletion record
      await UserDeletion.deleteMany({ user_id: user._id, status: "PENDING" });
    }

    // Delete the request
    await DeleteAccountRequest.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Request rejected and deleted successfully."
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};