/**
 * apiRoutes — the single place every module router is mounted under /api.
 * Mirrors the WMS `api/routes/apiRoutes.ts` aggregator.
 */
export {};
const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/routes/auth.routes');
const navigationRoutes = require('../modules/navigation/routes/navigation.routes');
const rbacRoutes = require('../modules/rbac/routes/rbac.routes');
const usersRoutes = require('../modules/users/routes/users.routes');
const requirementsRoutes = require('../modules/requirements/routes/requirements.routes');

// Liveness — is the process up? (Cheap; never touches the DB.)
router.get('/health', (_req: any, res: any) =>
  res.json({ success: true, service: 'nirmaan-backend', ts: new Date().toISOString() }));

// Readiness — should the load balancer route traffic here? Verifies the DB pool
// actually answers, so an instance with an exhausted/broken pool is pulled out of
// rotation instead of silently failing real requests.
router.get('/ready', async (_req: any, res: any) => {
  try {
    const sqldb = require((global as any).appRoot + '/config/db.config');
    await sqldb.AppPool.query('SELECT 1');
    return res.json({ success: true, ready: true, ts: new Date().toISOString() });
  } catch (e: any) {
    return res.status(503).json({ success: false, ready: false, message: 'database unavailable' });
  }
});

// ── Website (one_mason_web) — dedicated PUBLIC web routes, no auth ────────────
router.use('/web', require('../modules/web/routes/web.routes'));
// ── Nirmaan Digital ID / worker passport (6-digit code; /:code is public) ─────
router.use('/passport', require('../modules/passport/routes/passport.routes'));

router.use('/auth', authRoutes);
router.use('/stats', require('../modules/stats/routes/stats.routes'));
router.use('/nav', navigationRoutes);
router.use('/rbac', rbacRoutes);
router.use('/admin', require('../modules/admin/routes/admin.routes'));
router.use('/users', usersRoutes);
router.use('/requirements', requirementsRoutes);

// ── Domain modules ───────────────────────────────────────────────────────────
router.use('/hiring', require('../modules/hiring/routes/hiring.routes'));
router.use('/jobs', require('../modules/jobs/routes/jobs.routes'));
router.use('/bookings', require('../modules/bookings/routes/bookings.routes'));
router.use('/materials', require('../modules/materials/routes/materials.routes'));
router.use('/equipment', require('../modules/equipment/routes/equipment.routes'));
router.use('/credit', require('../modules/credit/routes/credit.routes'));
router.use('/workforce', require('../modules/workforce/routes/workforce.routes'));
router.use('/wages', require('../modules/wages/routes/wages.routes'));
router.use('/lending', require('../modules/lending/routes/lending.routes'));
router.use('/messaging', require('../modules/messaging/routes/messaging.routes'));
router.use('/notifications', require('../modules/notifications/routes/notifications.routes'));
router.use('/kyc', require('../modules/kyc/routes/kyc.routes'));
router.use('/billing', require('../modules/billing/routes/billing.routes'));
router.use('/wallet', require('../modules/wallet/routes/wallet.routes'));
router.use('/cashbook', require('../modules/cashbook/routes/cashbook.routes'));
router.use('/files', require('../modules/files/routes/files.routes'));
router.use('/referral', require('../modules/referral/routes/referral.routes'));
router.use('/portfolio', require('../modules/portfolio/routes/portfolio.routes'));

module.exports = router;
