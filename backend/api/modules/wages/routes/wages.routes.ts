/** Wages routes. Base: /api/wages (payroll actions gated to run_payroll) */
export {};
const express = require('express');
const Ctrl = require('../controllers/WageCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;
const canPayroll = AuthService.authorize('run_payroll');

router.get('/payments', auth, Ctrl.listPaymentsCtrl);
router.post('/payments', auth, canPayroll, Ctrl.createPaymentCtrl);
router.get('/adjustments', auth, Ctrl.listAdjustmentsCtrl);
router.post('/adjustments', auth, canPayroll, Ctrl.createAdjustmentCtrl);
router.get('/audit', auth, Ctrl.auditCtrl);

module.exports = router;
