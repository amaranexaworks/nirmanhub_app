/**
 * Files routes. Base path (mounted in apiRoutes): /api/files
 * All routes require auth; every file is owned by (and scoped to) the caller.
 */
export {};
const express = require('express');
const FilesCtrl = require('../controllers/FilesCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.post('/upload', auth, FilesCtrl.uploadCtrl);
router.get('/images', auth, FilesCtrl.listImagesCtrl);
router.get('/documents', auth, FilesCtrl.listDocumentsCtrl);
router.get('/image/:id', auth, FilesCtrl.getImageCtrl);
router.get('/document/:id', auth, FilesCtrl.getDocumentCtrl);
// Issue a capability signature (owner-scoped) so a link can be stored/rendered without
// embedding the caller's JWT.
router.get('/image/:id/sign', auth, FilesCtrl.signImageCtrl);
router.get('/document/:id/sign', auth, FilesCtrl.signDocumentCtrl);
// Raw bytes — auth handled inside the controller (capability ?fsig=, or a JWT via
// header / ?token=) so the URL can be used directly in <img>/download links.
router.get('/image/:id/raw', FilesCtrl.rawImageCtrl);
router.get('/document/:id/raw', FilesCtrl.rawDocumentCtrl);

module.exports = router;
