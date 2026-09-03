/**
 * Requirements routes. Base path (mounted in apiRoutes): /api/requirements
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/RequirementCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/service-types', auth, Ctrl.getServiceTypesCtrl);
router.get('/', auth, Ctrl.listCtrl);
router.get('/mine', auth, Ctrl.myPostsCtrl);
router.get('/my-responses', auth, Ctrl.myResponsesCtrl);   // Leads → My Proposals
router.get('/invited', auth, Ctrl.invitedCtrl);            // Leads → Invited
router.post('/', auth, AuthService.authorize('post_project'), Ctrl.createCtrl);
router.get('/:id/responses', auth, Ctrl.listResponsesCtrl);
router.post('/:id/responses', auth, AuthService.authorize('bid_project'), Ctrl.respondCtrl);
router.post('/:id/invite', auth, Ctrl.inviteCtrl);         // poster invites a professional

module.exports = router;
