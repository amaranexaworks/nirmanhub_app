import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';

export const workforceApi = {
  projects: () => apiGet<any[]>('/workforce/projects'),
  createProject: (body: { name: string; locationLabel?: string; lat?: number; lng?: number; notes?: string; status?: ProjectStatus }) => apiPost('/workforce/projects', body),
  setProjectStatus: (projectId: number | string, status: ProjectStatus) => apiPatch(`/workforce/projects/${projectId}/status`, { status }),
  supervisors: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/supervisors`),
  addSupervisor: (projectId: number | string, body: { name: string; phone?: string; site?: string }) => apiPost(`/workforce/projects/${projectId}/supervisors`, body),
  workers: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/workers`),
  addWorker: (projectId: number | string, body: any) => apiPost(`/workforce/projects/${projectId}/workers`, body),
  // Ghost-worker check — returns { duplicate, matches[] } for a given Aadhaar/mobile.
  checkDuplicateWorker: (params: { aadhaar?: string; mobile?: string }) => apiGet<{ duplicate: boolean; matches: any[] }>(`/workforce/workers/check-duplicate`, { params }),
  // Digital Worker Passport — portable cross-employer record + certifications.
  workerPassport: (workerId: number | string) => apiGet<any>(`/workforce/workers/${workerId}/passport`),
  addWorkerCert: (workerId: number | string, body: { name: string; issuer?: string; issuedOn?: string; expiresOn?: string; docUrl?: string; verified?: boolean }) => apiPost(`/workforce/workers/${workerId}/certs`, body),
  attendance: (projectId: number | string, from?: string, to?: string) => apiGet<any[]>(`/workforce/projects/${projectId}/attendance`, { params: { from, to } }),
  // Verified punch: lat/lng + selfie are optional; the server decides verified/flagged/manual.
  markAttendance: (projectId: number | string, body: { workerId: number; date: string; status?: string; overtime?: number; lat?: number; lng?: number; selfie?: string }) => apiPost(`/workforce/projects/${projectId}/attendance`, body),
  // Digital muster roll for a month ('YYYY-MM') — one row per worker with daily marks + totals.
  muster: (projectId: number | string, month: string) => apiGet<any[]>(`/workforce/projects/${projectId}/muster`, { params: { month } }),
  // Statutory compliance run (PF/ESI/BOCW) for a month — { month, rows[], totals }.
  compliance: (projectId: number | string, month: string) => apiGet<any>(`/workforce/projects/${projectId}/compliance`, { params: { month } }),
  expenses: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/expenses`),
  addExpense: (projectId: number | string, body: { category?: string; title: string; amount: number; date?: string; paidBy?: string; settled?: boolean }) => apiPost(`/workforce/projects/${projectId}/expenses`, body),

  // Daily Progress Report + cost tracking (budget vs actual)
  dpr: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/dpr`),
  addDpr: (projectId: number | string, body: { date?: string; manpower?: number; weather?: string; activities?: string; issues?: string; materials?: string; photo?: string }) => apiPost(`/workforce/projects/${projectId}/dpr`, body),
  costSummary: (projectId: number | string, month?: string) => apiGet<any>(`/workforce/projects/${projectId}/cost-summary`, { params: { month } }),
  setBudget: (projectId: number | string, budget: number) => apiPatch(`/workforce/projects/${projectId}/budget`, { budget }),

  // Safety & incident reporting
  incidents: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/incidents`),
  addIncident: (projectId: number | string, body: { type: string; severity?: string; workerId?: number; description: string; action?: string; date?: string; photo?: string }) => apiPost(`/workforce/projects/${projectId}/incidents`, body),
  safetySummary: (projectId: number | string) => apiGet<any>(`/workforce/projects/${projectId}/safety-summary`),
  setIncidentStatus: (incidentId: number | string, status: 'open' | 'closed') => apiPatch(`/workforce/incidents/${incidentId}/status`, { status }),

  // Management dashboard KPIs + "needs attention" inbox
  kpis: (projectId: number | string, month?: string) => apiGet<any>(`/workforce/projects/${projectId}/kpis`, { params: { month } }),
  // AI insights — fraud detection, labour forecast, contractor rating, payroll audit
  aiInsights: (projectId: number | string, month?: string) => apiGet<any>(`/workforce/projects/${projectId}/ai-insights`, { params: { month } }),
  advances: (workerId: number | string) => apiGet<any[]>(`/workforce/workers/${workerId}/advances`),
  addAdvance: (workerId: number | string, body: { amount: number; date?: string; note?: string }) => apiPost(`/workforce/workers/${workerId}/advances`, body),
  payouts: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/payouts`),
  addPayout: (projectId: number | string, body: { workerId: number; amount: number; periodKey?: string; date?: string }) => apiPost(`/workforce/projects/${projectId}/payouts`, body),

  // Contractors & billing (reconciled against the muster)
  contractors: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/contractors`),
  addContractor: (projectId: number | string, body: { name: string; phone?: string; gst?: string; serviceChargePct?: number }) => apiPost(`/workforce/projects/${projectId}/contractors`, body),
  reconcileContractor: (contractorId: number | string, from: string, to: string) => apiGet<any>(`/workforce/contractors/${contractorId}/reconcile`, { params: { from, to } }),
  contractorBills: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/contractor-bills`),
  createContractorBill: (projectId: number | string, body: { contractorId: number; from: string; to: string; claimedAmount?: number; notes?: string }) => apiPost(`/workforce/projects/${projectId}/contractor-bills`, body),
  setContractorBillStatus: (billId: number | string, status: 'draft' | 'approved' | 'paid' | 'disputed') => apiPatch(`/workforce/contractor-bills/${billId}/status`, { status }),

  // ── Flats / units + sales (035) ──
  units: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/units`),
  addUnit: (projectId: number | string, body: any) => apiPost(`/workforce/projects/${projectId}/units`, body),
  updateUnit: (unitId: number | string, body: any) => apiPatch(`/workforce/units/${unitId}`, body),
  removeUnit: (unitId: number | string) => apiDelete(`/workforce/units/${unitId}`),
  unitDocs: (unitId: number | string) => apiGet<any[]>(`/workforce/units/${unitId}/documents`),
  addUnitDoc: (unitId: number | string, body: { name: string; kind?: string; url?: string }) => apiPost(`/workforce/units/${unitId}/documents`, body),
  removeUnitDoc: (docId: number | string) => apiDelete(`/workforce/unit-documents/${docId}`),
  salesSummary: (projectId: number | string) => apiGet<any>(`/workforce/projects/${projectId}/sales-summary`),

  // Staged project documents (approvals → construction → completion → sales)
  projectDocs: (projectId: number | string) => apiGet<any[]>(`/workforce/projects/${projectId}/documents`),
  addProjectDoc: (projectId: number | string, body: { stage?: string; kind?: string; name: string; url?: string; issuedOn?: string }) => apiPost(`/workforce/projects/${projectId}/documents`, body),
  removeProjectDoc: (docId: number | string) => apiDelete(`/workforce/project-documents/${docId}`),

  // Multi-site: shift a worker to another site
  moveWorker: (workerId: number | string, body: { toProjectId: number | string; toSupervisorId?: number | string }) => apiPost(`/workforce/workers/${workerId}/move`, body),
  workerAssignments: (workerId: number | string) => apiGet<any[]>(`/workforce/workers/${workerId}/assignments`),
};
