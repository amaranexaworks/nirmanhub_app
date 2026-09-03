/**
 * Auth routes. Base path (mounted in apiRoutes): /api/auth
 */
export {};
const express = require('express');
const AuthCtrl = require('../controllers/AuthCtrl');
const AuthService = require('../services/AuthenticationService');

const router = express.Router();

// Password auth only (no OTP). Roles are selected during signup.
router.post('/register', AuthCtrl.registerCtrl);
router.post('/login', AuthCtrl.loginCtrl);
router.post('/social', AuthCtrl.socialLoginCtrl);
router.get('/me', AuthService.authenticate, AuthCtrl.meCtrl);
router.post('/switch-role', AuthService.authenticate, AuthCtrl.switchRoleCtrl);
router.post('/logout', AuthService.authenticate, AuthCtrl.logoutCtrl);

router.get('/health', (_req: any, res: any) =>
  res.status(200).json({ success: true, message: 'auth service running' }));

module.exports = router;
