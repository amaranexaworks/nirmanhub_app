/** Messaging routes. Base: /api/messaging */
export {};
const express = require('express');
const Ctrl = require('../controllers/MessagingCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/threads', auth, Ctrl.listThreadsCtrl);
router.post('/threads', auth, Ctrl.startThreadCtrl);
router.get('/threads/:id/messages', auth, Ctrl.messagesCtrl);
router.post('/threads/:id/messages', auth, Ctrl.sendCtrl);

module.exports = router;
