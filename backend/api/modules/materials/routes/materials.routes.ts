/** Materials routes. Base: /api/materials */
export {};
const express = require('express');
const Ctrl = require('../controllers/MaterialCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/categories', auth, Ctrl.categoriesCtrl);
router.get('/catalog', auth, Ctrl.catalogCtrl);
router.post('/catalog', auth, AuthService.authorize('list_material'), Ctrl.addItemCtrl);
router.get('/orders', auth, Ctrl.myOrdersCtrl);
router.post('/orders', auth, Ctrl.createOrderCtrl);
router.get('/orders/:id', auth, Ctrl.orderDetailCtrl);

module.exports = router;
