const express = require("express");
const router = express.Router();
const { upload } = require("../middleware/cloudinary.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  SendUserMessage,
  getallChatDetails,
} = require("../controllers/chatController.js");
    

router.post(
  API_ROUTES.CHAT.SEND_MESSAGE,
  upload.array("images", 2),
  [handleValidationErrors],
  SendUserMessage
);

router.get(
  API_ROUTES.CHAT.GET_MESSAGES,
  [handleValidationErrors],
  getallChatDetails
);

module.exports = router;
