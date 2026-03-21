const Concern = require("../models/concern.model");
const User = require("../models/User");
const { deleteFromCloudinary } = require("../middleware/cloudinary");




// CREATE CONCERN

exports.raiseConcern = async (req, res) => {
  try {
    const { name, phoneNumber, category, issueDescription } = req.body;

    // check registered user
    const user = await User.findOne({
      "basic_details.phone_number": phoneNumber
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "You are not registered user",
      });
    }

    // get uploaded image URLs from cloudinary
    let incidentProof = [];

    if (req.files && req.files.length > 0) {
      incidentProof = req.files.map((file) => file.path);
    }

    const concern = new Concern({
      user_id: user._id,
      name,
      phoneNumber,
      category,
      issueDescription,
      incidentProof,
    });

    await concern.save();

    return res.status(201).json({
      success: true,
      message: `Concern raised successfully. Your ticket id is ${concern._id}`,
      ticketId: concern._id,
      data: concern,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// // DELETE CONCERN

// exports.deleteConcern = async (req, res) => {
//   try {

//     const { id } = req.params;

//     const concern = await Concern.findById(id);

//     if (!concern) {
//       return res.status(404).json({
//         success: false,
//         message: "Concern not found",
//       });
//     }

//     // delete images from cloudinary
//     if (concern.incidentProof && concern.incidentProof.length > 0) {

//       for (const imageUrl of concern.incidentProof) {

//         // extract public_id from cloudinary URL
//         const parts = imageUrl.split("/");
//         const fileName = parts[parts.length - 1];
//         const publicId = "uploads/" + fileName.split(".")[0];

//         await deleteFromCloudinary(publicId);

//       }
//     }

//     // delete concern from database
//     await Concern.findByIdAndDelete(id);

//     return res.json({
//       success: true,
//       message: "Concern and attached images deleted successfully",
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });

//   }
// };

// DELETE CONCERN (single / multiple / by status)

exports.deleteConcern = async (req, res) => {
  try {

    const { id, ids, status } = req.body;

    let filter = {};

    // single id
    if (id) {
      filter._id = id;
    }

    // multiple ids
    if (ids && ids.length > 0) {
      filter._id = { $in: ids };
    }

    // delete by status
    if (status) {
      filter.status = status;
    }

    const concerns = await Concern.find(filter);

    if (!concerns || concerns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No concerns found",
      });
    }

    // delete images from cloudinary
    for (const concern of concerns) {

      if (concern.incidentProof && concern.incidentProof.length > 0) {

        for (const imageUrl of concern.incidentProof) {

          const parts = imageUrl.split("/");
          const fileName = parts[parts.length - 1];
          const publicId = "uploads/" + fileName.split(".")[0];

          await deleteFromCloudinary(publicId);

        }
      }
    }

    // delete from database
    await Concern.deleteMany(filter);

    return res.json({
      success: true,
      message: `${concerns.length} concern(s) deleted successfully`,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message,
    });

  }
};


// GET CONCERNS

exports.getConcerns = async (req,res)=>{

try{

const {category,status,phoneNumber} = req.query;

let filter={};

if(category) filter.category=category;
if(status) filter.status=status;
if(phoneNumber) filter.phoneNumber=phoneNumber;

const concerns = await Concern
.find(filter)
.sort({createdAt:-1})
.populate("user_id","name phoneNumber");

res.json({

success:true,
total:concerns.length,
data:concerns

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};




// ADD MESSAGE IN CONVERSATION

exports.addConversation = async (req,res)=>{

try{

const {id} = req.params;

const {sender,message} = req.body;

const concern = await Concern.findByIdAndUpdate(

id,

{
$push:{
conversation:{
sender,
message
}
}
},

{new:true}

);

res.json({
success:true,
data:concern
});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// UPDATE STATUS

exports.updateStatus = async (req,res)=>{

try{

const {id} = req.params;
const {status} = req.body;

const concern = await Concern.findByIdAndUpdate(

id,
{status},
{new:true}

);

res.json({
success:true,
data:concern
});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};