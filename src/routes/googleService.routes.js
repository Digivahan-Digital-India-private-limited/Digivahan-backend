const express = require("express");
const router = express.Router();
const { bypassupload } = require("../middleware/bypassCloudinary.js");
const { authenticateTokenForAdmin } = require("../middleware/auth.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  AddGoogleService,
  getAllservice,
  Updateservice,
} = require("../controllers/googleServiceController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

router.post(
  API_ROUTES.SERVICE.ADD_SERVICE,
  authenticateTokenForAdmin,
  bypassupload.single("Icon"),
  [handleValidationErrors],
  AddGoogleService,
);

router.get(
  API_ROUTES.SERVICE.GET_SERVICE,
  [handleValidationErrors],
  getAllservice,
);

router.put(
  API_ROUTES.SERVICE.UPDATE_SERVICE,
  authenticateTokenForAdmin,
  bypassupload.single("Icon"),
  handleValidationErrors,
  Updateservice,
);

module.exports = router;
