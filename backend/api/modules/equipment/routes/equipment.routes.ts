/** Equipment routes. Base: /api/equipment */
export {};
const express = require('express');
const Ctrl = require('../controllers/EquipCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/', auth, Ctrl.catalogCtrl);
router.get('/mine', auth, Ctrl.mineCtrl);
router.get('/rentals', auth, Ctrl.myRentalsCtrl);
router.post('/', auth, Ctrl.addCtrl);
router.post('/:id/rent', auth, Ctrl.rentCtrl);

module.exports = router;
