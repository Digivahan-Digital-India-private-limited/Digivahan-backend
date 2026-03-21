const mongoose = require("mongoose");

const deleteAccountSchema = new mongoose.Schema(
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

email:{
type:String,
default:""
},

reason:{
type:String,
required:true
},

otherReason:{
type:String,
default:""
},

status:{
type:String,
enum:["new","checked","closed"],
default:"new",
index:true
}

},
{
timestamps:true
}
);

deleteAccountSchema.index({ phoneNumber:1,status:1 });

module.exports = mongoose.model("DeleteAccountRequest",deleteAccountSchema);