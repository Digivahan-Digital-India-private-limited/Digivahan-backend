const express = require("express");
const router = express.Router();
const { profilePicParser } = require("../middleware/cloudinary.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  AddEmergencyContact,
  UpdateUserEmergencyContact,
  DeleteUserEmergencyContact,
} = require("../controllers/emergencyContactController.js");

router.post(
  API_ROUTES.EMERGENCY_CONTACT.ADD_CONTACT,
  profilePicParser,
  [commonValidations.userId("user_id"), handleValidationErrors],
  AddEmergencyContact
);

router.put(
  API_ROUTES.EMERGENCY_CONTACT.UPDATE_CONTACTS,
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
  [
    commonValidations.userId("user_id"),
    commonValidations.contactId("contact_id"),
    handleValidationErrors,
  ],
  DeleteUserEmergencyContact
);

module.exports = router;
