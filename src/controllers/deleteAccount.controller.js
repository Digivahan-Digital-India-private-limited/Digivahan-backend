const DeleteAccountRequest = require("../models/deleteAccountRequest.model");
const User = require("../models/User");



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

const {id} = req.params;
const {status} = req.body;

const request = await DeleteAccountRequest.findByIdAndUpdate(

id,
{status},
{new:true}

);

if(!request){

return res.status(404).json({
success:false,
message:"Request not found"
});

}

res.json({

success:true,
message:"Request status updated",
data:request

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};