const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
sender:{
type:String,
enum:["user","admin"]
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

const historySchema = new mongoose.Schema(
{
status:{
type:String,
enum:["pending","escalated","resolved","rejected"]
},

note:{
type:String,
default:""
},

updatedByName:String,
updatedByPhone:String,

updatedAt:{
type:Date,
default:Date.now
}

},
{_id:false}
);

const attachmentSchema = new mongoose.Schema(
{
url:String,
public_id:String
},
{_id:false}
);

const reportIssueSchema = new mongoose.Schema(
{

ticketId:{
type:String,
unique:true,
index:true
},

user_id:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
index:true
},

name:String,

phoneNumber:{
type:String,
index:true
},

email:String,

issueType:{
type:String,
index:true
},

priority:{
type:String,
enum:["low","medium","high","critical"],
default:"low",
index:true
},

reportTitle:String,

reportDetails:String,

attachments:[attachmentSchema],

status:{
type:String,
enum:["pending","escalated","resolved","rejected"],
default:"pending",
index:true
},

assignedTo:{
name:String,
phone:String
},

conversation:[conversationSchema],

internalNotes:[
{
note:String,
addedBy:String,
createdAt:{
type:Date,
default:Date.now
}
}
],

history:[historySchema]

},
{
timestamps:true
}
);

reportIssueSchema.index({phoneNumber:1,status:1});

module.exports = mongoose.model("ReportIssue",reportIssueSchema);