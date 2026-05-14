const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();
const { uploadpdf } = require("../middleware/cloudinary.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  UploadvehicleDoc,
  deleteVehicleDoc,
} = require("../controllers/uploadDocController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

router.post(
  API_ROUTES.UPLOAD.FILE_UPLOAD.SINGLE,
  authenticateToken,
  uploadpdf.single("doc_file"),
  [
    commonValidations.userId("user_id"),
    commonValidations.docType("doc_type"),
    handleValidationErrors,
  ],
  UploadvehicleDoc
);

router.post(
  API_ROUTES.UPLOAD.FILE_UPLOAD.DOC_DELETE,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.docType("doc_type"),
    handleValidationErrors,
  ],
  deleteVehicleDoc
);

module.exports = router;
