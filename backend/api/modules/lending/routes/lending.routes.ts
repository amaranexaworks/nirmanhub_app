/** Lending routes. Base: /api/lending */
export {};
const express = require('express');
const Ctrl = require('../controllers/LendingCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/products', auth, Ctrl.listProductsCtrl);
router.post('/products', auth, AuthService.authorize('list_loan_product'), Ctrl.createProductCtrl);
router.post('/products/:id/apply', auth, AuthService.authorize('apply_loan'), Ctrl.applyCtrl);
router.get('/applications', auth, Ctrl.myApplicationsCtrl);
router.get('/review-queue', auth, AuthService.authorize('review_loan'), Ctrl.reviewQueueCtrl);
router.patch('/applications/:id', auth, AuthService.authorize('review_loan'), Ctrl.reviewCtrl);

module.exports = router;
