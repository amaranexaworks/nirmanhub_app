/**
 * Navigation routes. Base path (mounted in apiRoutes): /api/nav
 */
export {};
const express = require('express');
const MenuCtrl = require('../controllers/MenuCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;
const canAdmin = AuthService.authorize('admin_access');

// Resolved menu for the current user (tabs, drawer, workspace + admin sidebars).
router.get('/menu', auth, MenuCtrl.getMenuCtrl);
router.get('/menu-items', auth, MenuCtrl.getAllMenuItemsCtrl);

// ── Admin menu management (DB-driven navigation) — admin only ──
router.get('/menu-assignments', auth, canAdmin, MenuCtrl.getMenuAssignmentsCtrl);
router.post('/menu-items', auth, canAdmin, MenuCtrl.createMenuItemCtrl);
router.patch('/menu-items/:id', auth, canAdmin, MenuCtrl.updateMenuItemCtrl);
router.post('/menu-items/:id/active', auth, canAdmin, MenuCtrl.setMenuItemActiveCtrl);
router.put('/menu-items/:id/archetypes', auth, canAdmin, MenuCtrl.setMenuItemArchetypesCtrl);

module.exports = router;
