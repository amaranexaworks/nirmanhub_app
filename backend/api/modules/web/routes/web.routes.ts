/**
 * Web routes. Base: /api/web
 * Dedicated PUBLIC routes for the website (one_mason_web). No auth middleware —
 * these are read-only browse endpoints. Personal / write actions still go through
 * the authenticated domain routes (/api/jobs, /api/bookings, …) after login.
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/WebDiscoveryCtrl');
const router = express.Router();

router.get('/health', Ctrl.healthCtrl);
router.get('/jobs', Ctrl.jobsCtrl);
router.get('/materials', Ctrl.materialsCtrl);
router.get('/material-categories', Ctrl.materialCategoriesCtrl);
router.get('/material-subtypes', Ctrl.materialSubtypesCtrl);
router.get('/material-brands', Ctrl.materialBrandsCtrl);
router.get('/material-item/:id', Ctrl.materialItemCtrl);
router.get('/promos', Ctrl.promosCtrl);
router.get('/material-highlights', Ctrl.materialHighlightsCtrl);
router.get('/material-kits', Ctrl.materialKitsCtrl);
router.get('/material-kit/:id', Ctrl.materialKitCtrl);
router.get('/equipment', Ctrl.equipmentCtrl);
router.get('/professionals', Ctrl.professionalsCtrl);

module.exports = router;
