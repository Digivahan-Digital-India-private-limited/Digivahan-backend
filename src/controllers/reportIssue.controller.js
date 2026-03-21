const ReportIssue = require("../models/reportIssue.model");
const User = require("../models/User");
const { deleteFromCloudinary } = require("../middleware/cloudinary");


// CREATE ISSUE

exports.createReportIssue = async (req,res)=>{

try{

const {
name,
phoneNumber,
email,
issueType,
priority,
reportTitle,
reportDetails
} = req.body;


// verify registered user

const user = await User.findOne({
"basic_details.phone_number":phoneNumber
});

if(!user){

return res.status(400).json({
success:false,
message:"You are not registered user"
});

}


// attachments

let attachments=[];

if(req.files && req.files.length>0){

attachments=req.files.map(file=>({

url:file.path,
public_id:file.filename

}));

}


// generate ticket id

const count = await ReportIssue.countDocuments();

const ticketId=`DIGI-REP-${String(count+1).padStart(6,"0")}`;


const report = new ReportIssue({

ticketId,
user_id:user._id,
name,
phoneNumber,
email,
issueType,
priority,
reportTitle,
reportDetails,
attachments,

history:[
{
status:"pending",
note:"Issue reported",
updatedByName:name,
updatedByPhone:phoneNumber
}
]

});

await report.save();

res.status(201).json({

success:true,
message:"Issue reported successfully",
ticketId:ticketId,
data:report

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// GET LIST

exports.getReportIssues = async (req,res)=>{

try{

const {status}=req.query;

let filter={};

if(status){
filter.status=status;
}

const issues = await ReportIssue
.find(filter)
.sort({createdAt:-1});

res.json({

success:true,
total:issues.length,
data:issues

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// UPDATE ISSUE

exports.updateReportIssue = async (req,res)=>{

try{

const {id}=req.params;

const {
status,
note,
updatedByName,
updatedByPhone,
agentName,
agentPhone
}=req.body;


const issue = await ReportIssue.findById(id);

if(!issue){

return res.status(404).json({
success:false,
message:"Issue not found"
});

}


issue.status=status;

issue.assignedTo={
name:agentName,
phone:agentPhone
};

issue.history.push({

status,
note,
updatedByName,
updatedByPhone

});

await issue.save();

res.json({

success:true,
message:"Issue updated successfully",
data:issue

});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// DELETE ISSUE

exports.deleteReportIssue = async (req,res)=>{

try{

const {ids,status}=req.body;

let issues=[];


// delete by ids

if(ids && ids.length>0){

issues=await ReportIssue.find({
_id:{ $in:ids }
});

await ReportIssue.deleteMany({
_id:{ $in:ids }
});

}


// delete by status

if(status){

issues=await ReportIssue.find({status});

await ReportIssue.deleteMany({status});

}


// delete attachments from cloudinary

for(const issue of issues){

for(const file of issue.attachments){

if(file.public_id){

await deleteFromCloudinary(file.public_id);

}

}

}


res.json({
success:true,
message:"Issues deleted successfully"
});

}catch(error){

res.status(500).json({
success:false,
error:error.message
});

}

};

// GET ISSUE BY TICKET ID

exports.getIssueByTicketId = async (req,res)=>{

    try{
    
    const {ticketId} = req.params;
    
    const issue = await ReportIssue.findOne({ticketId});
    
    if(!issue){
    
    return res.status(404).json({
    success:false,
    message:"Issue not found"
    });
    
    }
    
    res.json({
    
    success:true,
    data:issue
    
    });
    
    }catch(error){
    
    res.status(500).json({
    success:false,
    error:error.message
    });
    
    }
    
    };