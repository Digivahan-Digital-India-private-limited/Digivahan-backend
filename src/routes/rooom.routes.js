const express = require("express");
const router = express.Router();

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  createRoom,
  getAllChatRoomFromUserAccount,
  GetChatRoomInfo,
} = require("../controllers/roomController.js");

router.post(
  API_ROUTES.CHAT.CREATE_ROOM_FOR_CHAT,
  createRoom
);

router.post(
  API_ROUTES.CHAT.GET_USER_CHATS_ROOM_DETAILS,
  [commonValidations.userId("user_id"), handleValidationErrors],
  getAllChatRoomFromUserAccount
);

router.get(
  API_ROUTES.CHAT.GET_ROOM_DETAILS,
  [handleValidationErrors],
  GetChatRoomInfo
);

module.exports = router;
