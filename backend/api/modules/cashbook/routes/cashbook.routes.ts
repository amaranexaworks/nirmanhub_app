/**
 * Cashbook routes. Base path (mounted in apiRoutes): /api/cashbook
 * All routes require auth; every handler additionally verifies project ownership.
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/CashbookCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/:projectId/summary', auth, Ctrl.summaryCtrl);
router.get('/:projectId', auth, Ctrl.listCtrl);
router.post('/:projectId', auth, Ctrl.createCtrl);
router.delete('/:projectId/:id', auth, Ctrl.removeCtrl);

module.exports = router;
