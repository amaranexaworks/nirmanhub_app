/** KYC routes. Base: /api/kyc
 * User self-service: status, submit docs, book a verification slot.
 * Admin (verify_kyc): the verification queue and approve/reject. */
export {};
const express = require('express');
const Ctrl = require('../controllers/KycCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;
const canVerify = AuthService.authorize('verify_kyc');

// ── User self-service ────────────────────────────────────────────────────────
router.get('/status', auth, Ctrl.statusCtrl);
router.post('/submit', auth, Ctrl.submitCtrl);
router.post('/slot', auth, Ctrl.bookSlotCtrl);

// ── Admin verification (Slice-style: employee calls the user, then decides) ──
router.get('/queue', auth, canVerify, Ctrl.queueCtrl);
router.patch('/:id/review', auth, canVerify, Ctrl.reviewCtrl);

module.exports = router;
