/** Notifications routes. Base: /api/notifications */
export {};
const express = require('express');
const Ctrl = require('../controllers/NotificationCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/', auth, Ctrl.listCtrl);
router.get('/unread-count', auth, Ctrl.unreadCountCtrl);
router.post('/', auth, Ctrl.createCtrl);
router.post('/:id/read', auth, Ctrl.markReadCtrl);
router.post('/read-all', auth, Ctrl.markAllReadCtrl);

module.exports = router;
