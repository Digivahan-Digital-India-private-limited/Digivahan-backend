const express = require("express");
const router = express.Router();
const { initChallanFlow, verifyChallanOtp, getChallanHistory, getChallanPaymentUrl, refreshChallans, directSearchChallans, renderCheckoutHtml } = require("../controllers/challanFlowController");
const { API_ROUTES } = require("../../constants/apiRoutes");
const { authenticateToken } = require("../middleware/auth");

router.post(API_ROUTES.CHALLAN_FLOW.INIT, initChallanFlow);
router.post(API_ROUTES.CHALLAN_FLOW.VERIFY, verifyChallanOtp);
router.get(API_ROUTES.CHALLAN_FLOW.HISTORY, authenticateToken, getChallanHistory);
router.post(API_ROUTES.CHALLAN_FLOW.PAYMENT_URL, getChallanPaymentUrl);
router.post("/refresh", authenticateToken, refreshChallans);
router.post("/direct-search", authenticateToken, directSearchChallans);

router.get("/render-checkout/:checkoutId", renderCheckoutHtml);

module.exports = router;
