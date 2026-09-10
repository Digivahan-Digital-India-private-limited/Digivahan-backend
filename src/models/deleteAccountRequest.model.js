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
},

deviceType:{
type:String,
enum:["ios","android","web"],
default:"web",
index:true
},

duration:{
type:Number,
default:0
},

deleteRequestDate:{
type:String,
default:null
},

deleteRequestProcessDate:{
type:String,
default:null
}

},
{
timestamps:true
}
);

deleteAccountSchema.index({ phoneNumber:1,status:1 });

module.exports = mongoose.model("DeleteAccountRequest",deleteAccountSchema);