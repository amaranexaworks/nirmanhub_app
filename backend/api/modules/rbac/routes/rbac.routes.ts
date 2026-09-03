/**
 * RBAC routes. Base path (mounted in apiRoutes): /api/rbac
 * Catalog reads are open to any authenticated user (needed by onboarding);
 * assignment writes should be admin-gated in production (see TODO).
 */
export {};
const express = require('express');
const RbacCtrl = require('../controllers/RbacCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;
const canManageUsers = AuthService.authorize('manage_users');

// Catalog (config the client hydrates from)
router.get('/bootstrap', auth, RbacCtrl.bootstrapCtrl);
router.get('/archetypes', auth, RbacCtrl.getArchetypesCtrl);
router.get('/roles', auth, RbacCtrl.getRolesCtrl);
router.get('/capabilities', auth, RbacCtrl.getCapabilitiesCtrl);
router.get('/departments', auth, RbacCtrl.getDepartmentsCtrl);

// Assignments — privileged: only admins (manage_users) may change who holds what.
router.post('/users/:userId/roles', auth, canManageUsers, RbacCtrl.assignRoleCtrl);
router.delete('/users/:userId/roles/:rleId', auth, canManageUsers, RbacCtrl.removeRoleCtrl);
router.post('/users/:userId/departments', auth, canManageUsers, RbacCtrl.assignDepartmentCtrl);

module.exports = router;
