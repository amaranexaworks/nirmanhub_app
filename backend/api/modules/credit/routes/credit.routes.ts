/** Credit routes. Base: /api/credit */
export {};
const express = require('express');
const Ctrl = require('../controllers/CreditCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/orders', auth, Ctrl.listCtrl);
router.post('/orders', auth, Ctrl.createCtrl);
router.post('/orders/:id/pay', auth, Ctrl.payCtrl);

module.exports = router;
