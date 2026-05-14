const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { UserAddAddress, UpdateUserAddress, DeleteUserAddress } = require("../controllers/addressController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

router.post(
    API_ROUTES.ADDRESSBOOK.ADD_ADDRESS, 
    [
        commonValidations.userId("user_id"),
        handleValidationErrors
    ],
    UserAddAddress
);

router.put(
    API_ROUTES.ADDRESSBOOK.UPDATE_ADDRESSES,
    [
        commonValidations.userId("user_id"),
        commonValidations.addressId("address_id"),
        handleValidationErrors
    ],
    UpdateUserAddress
)

router.post(
    API_ROUTES.ADDRESSBOOK.DELETE_ADDRESS,
    [
        commonValidations.userId("user_id"),
        commonValidations.addressId("address_id"),
        handleValidationErrors
    ],
    DeleteUserAddress
)

module.exports = router;
