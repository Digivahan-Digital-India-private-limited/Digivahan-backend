const CareerJob = require("../models/career.model");
const Application = require("../models/application.model");
const path = require("path");
const fs = require("fs");

/* ─────────────────────────────────────────────
   1. CREATE JOB  (Admin only)
   POST /api/career/jobs
───────────────────────────────────────────── */
const createJob = async (req, res) => {
  try {
    const { title, department, location, type, experience, description } =
      req.body;

    if (
      !title ||
      !department ||
      !location ||
      !type ||
      !experience ||
      !description
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    const job = await CareerJob.create({
      title: title.trim(),
      department,
      location: location.trim(),
      type,
      experience: experience.trim(),
      description: description.trim(),
      status: "Open",
    });

    return res.status(201).json({
      status: true,
      message: "Job posted successfully",
      job,
    });
  } catch (error) {
    console.error("createJob error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   2. GET ALL JOBS  (Public)
   GET /api/career/jobs?status=Open&department=Engineering
───────────────────────────────────────────── */
const getAllJobs = async (req, res) => {
  try {
    const { status, department, search } = req.query;

    const filter = {};
    if (status && ["Open", "Closed"].includes(status)) {
      filter.status = status;
    }
    if (department && department !== "All") {
      filter.department = department;
    }
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { location: { $regex: search.trim(), $options: "i" } },
        { type: { $regex: search.trim(), $options: "i" } },
        { department: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const jobs = await CareerJob.find(filter).sort({ createdAt: -1 }).lean();

    // Add virtual "posted" field manually for .lean() results
    const jobsWithPosted = jobs.map((job) => ({
      ...job,
      id: job.jobId || job._id.toString(),
      posted: getRelativeTime(job.createdAt),
    }));

    return res.status(200).json({
      status: true,
      jobs: jobsWithPosted,
    });
  } catch (error) {
    console.error("getAllJobs error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   3. TOGGLE JOB STATUS  (Admin only)
   PATCH /api/career/jobs/:id/status
───────────────────────────────────────────── */
const toggleJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find by jobId (DV-101 format) or MongoDB _id
    const job = await CareerJob.findOne({
      $or: [{ jobId: id }, { _id: isValidObjectId(id) ? id : null }],
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: "Job not found",
      });
    }

    job.status = job.status === "Open" ? "Closed" : "Open";
    await job.save();

    return res.status(200).json({
      status: true,
      message: `Job ${job.status === "Open" ? "reopened" : "closed"} successfully`,
      job: {
        ...job.toJSON(),
        id: job.jobId || job._id.toString(),
        posted: getRelativeTime(job.createdAt),
      },
    });
  } catch (error) {
    console.error("toggleJobStatus error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   4. SUBMIT APPLICATION  (Public)
   POST /api/career/applications  (multipart/form-data)
───────────────────────────────────────────── */
const submitApplication = async (req, res) => {
  try {
    const { jobId, jobTitle, candidateName, email, phone, coverLetter } =
      req.body;

    if (!jobId || !jobTitle || !candidateName || !email || !phone) {
      return res.status(400).json({
        status: false,
        message: "jobId, jobTitle, candidateName, email, and phone are required",
      });
    }

    // CV file handling (multer sets req.file)
    let cvFileName = null;
    let cvFilePath = null;
    if (req.file) {
      cvFileName = req.file.originalname;
      cvFilePath = `/uploads/cvs/${req.file.filename}`;
    }

    const application = await Application.create({
      jobId,
      jobTitle,
      candidateName: candidateName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      coverLetter: coverLetter ? coverLetter.trim() : "",
      cvFileName,
      cvFilePath,
    });

    return res.status(201).json({
      status: true,
      message: "Application submitted successfully",
      application: {
        ...application.toJSON(),
        appliedOn: getRelativeTime(application.createdAt),
      },
    });
  } catch (error) {
    console.error("submitApplication error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   5. GET ALL APPLICATIONS  (Admin only)
   GET /api/career/applications?jobTitle=X&search=Y
───────────────────────────────────────────── */
const getApplications = async (req, res) => {
  try {
    const { jobTitle, search, period } = req.query;

    const filter = {};
    if (jobTitle && jobTitle !== "All") {
      filter.jobTitle = jobTitle;
    }
    if (search && search.trim()) {
      filter.$or = [
        { candidateName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Period filter
    if (period && period !== "all") {
      const now = new Date();
      let startDate;
      if (period === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "this_week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else if (period === "this_month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const host = req.get("host");
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const applicationsFormatted = applications.map((app) => ({
      ...app,
      id: app._id.toString(),
      appliedOn: getRelativeTime(app.createdAt),
      // Provide CV download URL if file exists
      cvDataUrl: app.cvFilePath
        ? `${baseUrl}${app.cvFilePath}`
        : null,
    }));

    return res.status(200).json({
      status: true,
      applications: applicationsFormatted,
    });
  } catch (error) {
    console.error("getApplications error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   HELPER FUNCTIONS
───────────────────────────────────────────── */
function getRelativeTime(date) {
  if (!date) return "Unknown";
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 5) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffWeeks < 5)
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
}

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

/* ─────────────────────────────────────────────
   6. UPDATE APPLICATION STATUS (Admin only)
   PATCH /api/career/applications/:id/status
───────────────────────────────────────────── */
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Pending", "Reviewed", "Shortlisted", "Rejected"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Valid status (Pending, Reviewed, Shortlisted, Rejected) is required",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid application ID",
      });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        status: false,
        message: "Application not found",
      });
    }

    application.status = status;
    await application.save();

    const host = req.get("host");
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    return res.status(200).json({
      status: true,
      message: `Application status updated to ${status} successfully`,
      application: {
        ...application.toJSON(),
        id: application._id.toString(),
        appliedOn: getRelativeTime(application.createdAt),
        cvDataUrl: application.cvFilePath
          ? `${baseUrl}${application.cvFilePath}`
          : null,
      },
    });
  } catch (error) {
    console.error("updateApplicationStatus error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   7. DELETE JOB  (Admin only)
   DELETE /api/career/jobs/:id
───────────────────────────────────────────── */
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Find by jobId (DV-101 format) or MongoDB _id
    const job = await CareerJob.findOne({
      $or: [{ jobId: id }, { _id: isValidObjectId(id) ? id : null }],
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: "Job not found",
      });
    }

    await CareerJob.deleteOne({ _id: job._id });

    return res.status(200).json({
      status: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("deleteJob error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ─────────────────────────────────────────────
   8. DELETE APPLICATION  (Admin only)
   DELETE /api/career/applications/:id
───────────────────────────────────────────── */
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid application ID",
      });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        status: false,
        message: "Application not found",
      });
    }

    // Delete uploaded CV file if it exists
    if (application.cvFilePath) {
      const cvFullPath = path.join(__dirname, "../..", application.cvFilePath);
      if (fs.existsSync(cvFullPath)) {
        try {
          fs.unlinkSync(cvFullPath);
        } catch (fileErr) {
          console.error("Failed to delete CV file:", fileErr);
        }
      }
    }

    await Application.deleteOne({ _id: id });

    return res.status(200).json({
      status: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("deleteApplication error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createJob,
  getAllJobs,
  toggleJobStatus,
  submitApplication,
  getApplications,
  updateApplicationStatus,
  deleteJob,
  deleteApplication,
};
