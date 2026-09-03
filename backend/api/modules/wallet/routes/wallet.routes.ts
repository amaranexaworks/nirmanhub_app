/**
 * Wallet routes. Base path (mounted in apiRoutes): /api/wallet
 * All routes require an authenticated user; the ledger is per-caller.
 */
export {};
const express = require('express');
const WalletCtrl = require('../controllers/WalletCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/balance', auth, WalletCtrl.balanceCtrl);
router.get('/transactions', auth, WalletCtrl.transactionsCtrl);
router.post('/add', auth, WalletCtrl.addMoneyCtrl);
router.post('/withdraw', auth, WalletCtrl.withdrawCtrl);

module.exports = router;
