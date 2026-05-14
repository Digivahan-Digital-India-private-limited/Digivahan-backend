const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();
const { upload } = require("../middleware/cloudinary.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  SendUserMessage,
  getallChats,
} = require("../controllers/chatController.js");
    

router.post(
  API_ROUTES.CHAT.SEND_MESSAGE,
  authenticateToken,
  upload.array("images", 2),
  [handleValidationErrors],
  SendUserMessage
);

router.get(
  API_ROUTES.CHAT.GET_MESSAGES,
  authenticateToken,
  [handleValidationErrors],
  getallChats
);

module.exports = router;
