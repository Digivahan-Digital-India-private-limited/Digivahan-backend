const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const { addUserReview, FetchUserFeedBack, getReviewAnalytics, replyToReview } = require("../controllers/reviewController.js");

router.post(
  API_ROUTES.REVIEW.SUBMIT_REVIEW,
  [
    commonValidations.userId("user_id"),
    handleValidationErrors,
  ],
  addUserReview
)

router.post(
  API_ROUTES.REVIEW.USER_FEEDBACK,
  [
    commonValidations.productType("product_type"),
    handleValidationErrors,
  ],
  FetchUserFeedBack
)


router.get(
  API_ROUTES.REVIEW.REVIEW_ANALYTICS,
  getReviewAnalytics
);

router.post(
  API_ROUTES.REVIEW.REPLY,
  replyToReview
);

module.exports = router;
