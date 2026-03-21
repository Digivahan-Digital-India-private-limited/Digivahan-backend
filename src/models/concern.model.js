const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
sender:{
type:String,
enum:["user","admin"],
required:true
},

message:{
type:String
},

sentAt:{
type:Date,
default:Date.now
}

},
{_id:false}
);

const concernSchema = new mongoose.Schema(
{

user_id:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
index:true
},

name:{
type:String,
required:true
},

phoneNumber:{
type:String,
required:true,
index:true
},

category:{
type:String,
required:true,
index:true
},

issueDescription:{
type:String,
required:true
},

incidentProof:{
type:[String]
},

status:{
type:String,
enum:["open","in_progress","resolved","closed"],
default:"open",
index:true
},

conversation:[conversationSchema]

},
{
timestamps:true
}
);

concernSchema.index({phoneNumber:1,status:1});

module.exports = mongoose.model("Concern",concernSchema);