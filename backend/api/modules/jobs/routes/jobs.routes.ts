/** Jobs routes. Base: /api/jobs */
export {};
const express = require('express');
const Ctrl = require('../controllers/JobCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/', auth, Ctrl.listCtrl);
router.get('/mine', auth, Ctrl.myPostedCtrl);
router.get('/applied', auth, Ctrl.myAppliedCtrl);
router.get('/saved', auth, Ctrl.savedCtrl);
router.post('/', auth, AuthService.authorize('post_job'), Ctrl.createCtrl);
router.get('/:id/applicants', auth, Ctrl.applicantsCtrl);
router.post('/:id/apply', auth, AuthService.authorize('apply_job'), Ctrl.applyCtrl);
router.post('/:id/save', auth, Ctrl.toggleSaveCtrl);

module.exports = router;
