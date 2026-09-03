/** Workforce routes. Base: /api/workforce (gated to orchestrator capabilities) */
export {};
const express = require('express');
const Ctrl = require('../controllers/WorkforceCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;
const canTeams = AuthService.authorize('manage_teams');
const canAttend = AuthService.authorize('mark_attendance');
const canPayroll = AuthService.authorize('run_payroll');

// Projects
router.get('/projects', auth, Ctrl.listProjectsCtrl);
router.post('/projects', auth, canTeams, Ctrl.createProjectCtrl);
router.patch('/projects/:projectId/status', auth, canTeams, Ctrl.updateProjectStatusCtrl);

// Supervisors
router.get('/projects/:projectId/supervisors', auth, Ctrl.listSupervisorsCtrl);
router.post('/projects/:projectId/supervisors', auth, canTeams, Ctrl.addSupervisorCtrl);

// Workers
router.get('/projects/:projectId/workers', auth, Ctrl.listWorkersCtrl);
router.post('/projects/:projectId/workers', auth, canTeams, Ctrl.addWorkerCtrl);
router.get('/workers/check-duplicate', auth, Ctrl.checkDuplicateWorkerCtrl);

// Digital Worker Passport — portable, cross-employer record + certifications
router.get('/workers/:workerId/passport', auth, Ctrl.getWorkerPassportCtrl);
router.get('/workers/:workerId/certs', auth, Ctrl.listWorkerCertsCtrl);
router.post('/workers/:workerId/certs', auth, canTeams, Ctrl.addWorkerCertCtrl);

// Attendance
router.get('/projects/:projectId/attendance', auth, Ctrl.getAttendanceCtrl);
router.post('/projects/:projectId/attendance', auth, canAttend, Ctrl.markAttendanceCtrl);
router.get('/projects/:projectId/muster', auth, Ctrl.getMusterRollCtrl);
router.get('/projects/:projectId/compliance', auth, Ctrl.getComplianceCtrl);

// Expenses
router.get('/projects/:projectId/expenses', auth, Ctrl.listExpensesCtrl);
router.post('/projects/:projectId/expenses', auth, canTeams, Ctrl.addExpenseCtrl);

// Daily Progress Report + cost tracking
router.get('/projects/:projectId/dpr', auth, Ctrl.listDprCtrl);
router.post('/projects/:projectId/dpr', auth, canTeams, Ctrl.addDprCtrl);
router.get('/projects/:projectId/cost-summary', auth, Ctrl.getCostSummaryCtrl);
router.patch('/projects/:projectId/budget', auth, canTeams, Ctrl.setProjectBudgetCtrl);

// Advances (per worker)
router.get('/workers/:workerId/advances', auth, Ctrl.listAdvancesCtrl);
router.post('/workers/:workerId/advances', auth, canPayroll, Ctrl.addAdvanceCtrl);

// Payouts
router.get('/projects/:projectId/payouts', auth, Ctrl.listPayoutsCtrl);
router.post('/projects/:projectId/payouts', auth, canPayroll, Ctrl.addPayoutCtrl);

// Management dashboard KPIs + needs-attention inbox
router.get('/projects/:projectId/kpis', auth, Ctrl.getProjectKpisCtrl);

// AI insights — fraud detection, labour forecast, contractor rating, payroll audit
router.get('/projects/:projectId/ai-insights', auth, Ctrl.getAiInsightsCtrl);

// Safety & incident reporting
router.get('/projects/:projectId/incidents', auth, Ctrl.listIncidentsCtrl);
router.post('/projects/:projectId/incidents', auth, canAttend, Ctrl.addIncidentCtrl);
router.get('/projects/:projectId/safety-summary', auth, Ctrl.getSafetySummaryCtrl);
router.patch('/incidents/:incidentId/status', auth, canTeams, Ctrl.setIncidentStatusCtrl);

// Contractors & billing (reconciled against the muster)
router.get('/projects/:projectId/contractors', auth, Ctrl.listContractorsCtrl);
router.post('/projects/:projectId/contractors', auth, canTeams, Ctrl.addContractorCtrl);
router.get('/contractors/:contractorId/reconcile', auth, Ctrl.reconcileContractorCtrl);
router.get('/projects/:projectId/contractor-bills', auth, Ctrl.listContractorBillsCtrl);
router.post('/projects/:projectId/contractor-bills', auth, canPayroll, Ctrl.createContractorBillCtrl);
router.patch('/contractor-bills/:billId/status', auth, canPayroll, Ctrl.setContractorBillStatusCtrl);

// Flats / units + sales (035)
router.get('/projects/:projectId/units', auth, Ctrl.listUnitsCtrl);
router.post('/projects/:projectId/units', auth, canTeams, Ctrl.addUnitCtrl);
router.patch('/units/:unitId', auth, canTeams, Ctrl.updateUnitCtrl);
router.delete('/units/:unitId', auth, canTeams, Ctrl.removeUnitCtrl);
router.get('/units/:unitId/documents', auth, Ctrl.listUnitDocsCtrl);
router.post('/units/:unitId/documents', auth, canTeams, Ctrl.addUnitDocCtrl);
router.delete('/unit-documents/:docId', auth, canTeams, Ctrl.removeUnitDocCtrl);
router.get('/projects/:projectId/sales-summary', auth, Ctrl.getSalesSummaryCtrl);

// Staged project documents (permission → construction → completion → sales)
router.get('/projects/:projectId/documents', auth, Ctrl.listProjectDocsCtrl);
router.post('/projects/:projectId/documents', auth, canTeams, Ctrl.addProjectDocCtrl);
router.delete('/project-documents/:docId', auth, canTeams, Ctrl.removeProjectDocCtrl);

// Multi-site: shift a worker to another site (+ history)
router.post('/workers/:workerId/move', auth, canTeams, Ctrl.moveWorkerCtrl);
router.get('/workers/:workerId/assignments', auth, Ctrl.listWorkerAssignmentsCtrl);

module.exports = router;
