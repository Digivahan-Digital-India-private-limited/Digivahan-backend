const express = require("express");
const router = express.Router();
const { upload, profilePicParser } = require("../middleware/cloudinary.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { authenticateToken } = require("../middleware/auth.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  AddEmergencyContact,
  UpdateUserEmergencyContact,
  DeleteUserEmergencyContact,
} = require("../controllers/emergencyContactController.js");

router.post(
  API_ROUTES.EMERGENCY_CONTACT.ADD_CONTACT,
  authenticateToken,
  profilePicParser,
  [commonValidations.userId("user_id"), handleValidationErrors],
  AddEmergencyContact
);

router.put(
  API_ROUTES.EMERGENCY_CONTACT.UPDATE_CONTACTS,
  authenticateToken,
  profilePicParser,
  [
    commonValidations.userId("user_id"),
    commonValidations.contactId("contact_id"),
    handleValidationErrors,
  ],
  UpdateUserEmergencyContact
);

router.post(
  API_ROUTES.EMERGENCY_CONTACT.DELETE_CONTACT,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.contactId("contact_id"),
    handleValidationErrors,
  ],
  DeleteUserEmergencyContact
);

module.exports = router;
