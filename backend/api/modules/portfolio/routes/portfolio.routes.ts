/**
 * Portfolio routes. Base path (mounted in apiRoutes): /api/portfolio
 * Reads are open to any authenticated user (view a profile's work); writes are
 * gated by the `manage_portfolio` capability.
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/PortfolioCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;
const canManage = AuthService.authorize('manage_portfolio');

router.get('/', auth, Ctrl.listCtrl);                 // ?userId= to view someone else's; default self
router.post('/', auth, canManage, Ctrl.createCtrl);
router.patch('/:id', auth, canManage, Ctrl.updateCtrl);
router.delete('/:id', auth, canManage, Ctrl.removeCtrl);

module.exports = router;
