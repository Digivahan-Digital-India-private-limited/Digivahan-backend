const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authenticateTokenForAdmin } = require("../middleware/auth");
const {
  createJob,
  getAllJobs,
  toggleJobStatus,
  submitApplication,
  getApplications,
  updateApplicationStatus,
  deleteJob,
  deleteApplication,
} = require("../controllers/career.controller");

// ── CV Upload Multer Setup (disk storage in /uploads/cvs/) ──────────────────
const cvUploadDir = path.join(__dirname, "../../uploads/cvs");
if (!fs.existsSync(cvUploadDir)) {
  fs.mkdirSync(cvUploadDir, { recursive: true });
}

const cvStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cvUploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  },
});

const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX, PNG, and JPG/JPEG files are allowed"));
    }
  },
});

// ── Routes ───────────────────────────────────────────────────────────────────

// Public — get all jobs (with optional filters: ?status=Open&department=X&search=Y)
router.get("/jobs", getAllJobs);

// Admin — post a new job
router.post("/jobs", authenticateTokenForAdmin, createJob);

// Admin — toggle job status (Open ↔ Closed)
router.patch("/jobs/:id/status", authenticateTokenForAdmin, toggleJobStatus);

// Public — submit an application (multipart/form-data with optional cv file)
router.post("/applications", cvUpload.single("cv"), submitApplication);

// Admin — get all applications (with optional filters)
router.get("/applications", authenticateTokenForAdmin, getApplications);

// Admin — update application status (Pending, Reviewed, Shortlisted, Rejected)
router.patch("/applications/:id/status", authenticateTokenForAdmin, updateApplicationStatus);

// Admin — delete a job posting
router.delete("/jobs/:id", authenticateTokenForAdmin, deleteJob);

// Admin — delete an application
router.delete("/applications/:id", authenticateTokenForAdmin, deleteApplication);

module.exports = router;
