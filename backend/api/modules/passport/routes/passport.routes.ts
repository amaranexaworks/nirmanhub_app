/** Passport routes. Base: /api/passport
 *  /me is authenticated (your own ID card); /:code is PUBLIC (scan/verify anyone). */
export {};
const express = require('express');
const Ctrl = require('../controllers/PassportCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/me', auth, Ctrl.myCtrl);
router.get('/:code', Ctrl.verifyCtrl); // public verification by 6-digit code

module.exports = router;
