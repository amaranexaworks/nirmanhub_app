/**
 * Users routes. Base path (mounted in apiRoutes): /api/users
 */
export {};
const express = require('express');
const UserCtrl = require('../controllers/UserCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/me', auth, UserCtrl.getMeCtrl);
router.put('/me', auth, UserCtrl.updateMeCtrl);
router.put('/me/password', auth, UserCtrl.changePasswordCtrl);
router.post('/me/skills', auth, UserCtrl.addSkillCtrl);
router.get('/:id', auth, UserCtrl.getByIdCtrl);

module.exports = router;
