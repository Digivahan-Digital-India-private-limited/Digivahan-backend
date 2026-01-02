const express = require("express");
const router = express.Router();

const {
  uploadQrBenefitThumbnail,
  deleteQrBenefit,
  updateQrBenefit,
  getAllQrBenefits,
} = require("../controllers/qrBenefits.controller");

const { profilePicParser } = require("../middleware/cloudinary");

router.post(
  "/api/v1/qr-benefits/thumbnail",
  profilePicParser,
  uploadQrBenefitThumbnail
);
// UPDATE (ALL OPTIONAL)
router.patch(
    "/api/v1/qr-benefits/:id",
    profilePicParser,
    updateQrBenefit
  );
// Delete QR benefit
router.delete(
    "/api/v1/qr-benefits/:id",
    deleteQrBenefit
  );

// GET ALL QR BENEFITS
router.get("/api/v1/qr-benefits", getAllQrBenefits);

module.exports = router;   // ✅ ONLY router export
