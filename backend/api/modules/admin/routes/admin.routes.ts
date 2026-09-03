/**
 * Admin routes. Base: /api/admin
 * Every route requires authentication AND an admin capability. The seeded
 * 'admin' archetype holds them all; finer capabilities allow limited admins later.
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/AdminCtrl');
const MaterialCtrl = require((global as any).appRoot + '/api/modules/materials/controllers/MaterialCtrl');
const MenuCtrl = require((global as any).appRoot + '/api/modules/navigation/controllers/MenuCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;
const canAnalytics = AuthService.authorize('view_analytics');
const canUsers = AuthService.authorize('manage_users');
const canContent = AuthService.authorize('moderate_content');
const canFinance = AuthService.authorize('oversee_finance');
const canBroadcast = AuthService.authorize('broadcast');
const canAdmin = AuthService.authorize('admin_access');

// ── Overview / analytics ─────────────────────────────────────────────────────
router.get('/overview', auth, canAnalytics, Ctrl.overviewCtrl);

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users', auth, canUsers, Ctrl.listUsersCtrl);
router.get('/users/:id', auth, canUsers, Ctrl.getUserCtrl);
router.patch('/users/:id/status', auth, canUsers, Ctrl.setUserStatusCtrl);
router.post('/users/:id/capabilities', auth, canUsers, Ctrl.setUserCapabilitiesCtrl);

// ── Content moderation ───────────────────────────────────────────────────────
router.get('/jobs', auth, canContent, Ctrl.listJobsCtrl);
router.patch('/jobs/:id/status', auth, canContent, Ctrl.setJobStatusCtrl);
router.get('/requirements', auth, canContent, Ctrl.listRequirementsCtrl);
router.patch('/requirements/:id/status', auth, canContent, Ctrl.setRequirementStatusCtrl);
router.get('/materials', auth, canContent, Ctrl.listMaterialsCtrl);
router.patch('/materials/:id/status', auth, canContent, Ctrl.setMaterialStatusCtrl);

// Verification-by-category (036): which categories need verifying + the pending queue
router.get('/material-categories', auth, canContent, MaterialCtrl.listCategoriesVerifyCtrl);
router.patch('/material-categories/:id/verify', auth, canContent, MaterialCtrl.setCategoryVerifyCtrl);
router.get('/material-pending', auth, canContent, MaterialCtrl.listPendingItemsCtrl);
router.patch('/material-items/:id/verify', auth, canContent, MaterialCtrl.setItemVerifyCtrl);

// Catalog images — admin sets a real photo on a category / product.
router.patch('/material-categories/:id/image', auth, canContent, Ctrl.setCategoryImageCtrl);
router.patch('/material-items/:id/image', auth, canContent, Ctrl.setItemImageCtrl);

// DB-driven navigation menu management
router.get('/menu-items', auth, canContent, MenuCtrl.getAllMenuItemsCtrl);
router.post('/menu-items', auth, canContent, MenuCtrl.createMenuItemCtrl);
router.patch('/menu-items/:id', auth, canContent, MenuCtrl.updateMenuItemCtrl);
router.patch('/menu-items/:id/active', auth, canContent, MenuCtrl.setMenuItemActiveCtrl);
router.get('/bookings', auth, canContent, Ctrl.listBookingsCtrl);

// ── Projects (workforce sites) ───────────────────────────────────────────────
router.get('/projects', auth, canContent, Ctrl.listProjectsCtrl);

// ── Finance oversight ────────────────────────────────────────────────────────
router.get('/loans', auth, canFinance, Ctrl.listLoansCtrl);
router.get('/wallet', auth, canFinance, Ctrl.listWalletCtrl);
router.get('/wages', auth, canFinance, Ctrl.listWagesCtrl);
router.get('/subscriptions', auth, canFinance, Ctrl.listSubscriptionsCtrl);
router.get('/material-orders', auth, canFinance, Ctrl.listMaterialOrdersCtrl);
router.get('/credit-orders', auth, canFinance, Ctrl.listCreditOrdersCtrl);

// ── Messaging + catalogs ─────────────────────────────────────────────────────
router.get('/threads', auth, canContent, Ctrl.listThreadsCtrl);
router.get('/catalog', auth, canContent, Ctrl.catalogCtrl);
router.post('/catalog/:kind', auth, canContent, Ctrl.catalogCreateCtrl);
router.patch('/catalog/:kind/:id', auth, canContent, Ctrl.catalogUpdateCtrl);

// ── Broadcast + audit ────────────────────────────────────────────────────────
router.post('/broadcast', auth, canBroadcast, Ctrl.broadcastCtrl);
router.get('/audit', auth, canAdmin, Ctrl.auditCtrl);
router.get('/logins', auth, canAdmin, Ctrl.loginsCtrl);

module.exports = router;
