/** Bookings routes. Base: /api/bookings */
export {};
const express = require('express');
const Ctrl = require('../controllers/BookingCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/', auth, Ctrl.listCtrl);
router.post('/', auth, Ctrl.createCtrl);
router.get('/:id', auth, Ctrl.getCtrl);
router.patch('/:id', auth, Ctrl.updateCtrl);

module.exports = router;
