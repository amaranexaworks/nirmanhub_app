import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useHistory } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IonIcon, IonAlert, IonActionSheet, IonToast, IonModal } from '@ionic/react';
import {
  addOutline, trashOutline, callOutline, locationOutline, cashOutline, walletOutline, chevronForward, closeOutline, peopleOutline,
  documentOutline, imageOutline, cloudUploadOutline, navigateOutline, mapOutline, searchOutline, downloadOutline, calculatorOutline, documentTextOutline,
  cameraOutline, timeOutline, checkmarkCircle, shieldCheckmarkOutline, createOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { StatCard } from '@design/patterns';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { reverseGeocode, approxAddress } from '@services/location/geolocation';
import { workforceApi } from '@services/api/workforceApi';
import { filesApi } from '@services/api/filesApi';
import { LocationField } from '@components/form/LocationField';
import { SyncStatusPill } from '@components/feedback/SyncStatusPill';
import { Calculator } from '../components/Calculator';
import {
  useWorkforceStore, EXPENSE_META, UNIT_STATUSES, type AttendanceMark, type ExpenseCategory, type ManagedWorker,
  type Unit, type UnitStatus,
} from '../store/workforceStore';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'team', label: 'Team' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'flats', label: 'Flats' },
  { key: 'docs', label: 'Docs' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'bills', label: 'Bills' },
  { key: 'files', label: 'Files' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TODAY_KEY = new Date().toISOString().slice(0, 10);
const TODAY_LABEL = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

type PeriodKind = 'week' | 'month' | 'all';
const PERIOD_OPTS: { key: PeriodKind; label: string }[] = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All' },
];
function isoOf(d: Date) { return d.toISOString().slice(0, 10); }
/** Date range + a stable key identifying this specific period instance. */
function periodRange(period: PeriodKind): { start?: string; end?: string; key: string; label: string } {
  if (period === 'all') return { key: 'all', label: 'All time' };
  const now = new Date();
  if (period === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    const start = new Date(y, m, 1), end = new Date(y, m + 1, 0);
    return { start: isoOf(start), end: isoOf(end), key: `month-${y}-${m + 1}`, label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }
  // Week containing today, Monday → Sunday.
  const now2 = new Date();
  const diffToMon = (now2.getDay() + 6) % 7; // 0=Sun → 6, 1=Mon → 0
  const start = new Date(now2); start.setDate(now2.getDate() - diffToMon);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { start: isoOf(start), end: isoOf(end), key: `week-${isoOf(start)}`, label: `${fmt(start)} – ${fmt(end)}` };
}
const MARKS: { m: AttendanceMark; label: string; tone: 'success' | 'danger' | 'warning' | 'info' }[] = [
  { m: 'P', label: 'Present', tone: 'success' },
  { m: 'A', label: 'Absent', tone: 'danger' },
];

export function WorkforcePage() {
  const {
    projects, ensureProject,
    supervisors: allSupervisors, workers: allWorkers, expenses: allExpenses, payouts: allPayouts,
    attendance, attendanceMeta, overtime, advances, addSupervisor, updateSupervisor, removeSupervisor, addWorker, removeWorker, updateWorker, moveWorker, mark, setOvertime,
    addExpense, removeExpense, settleSupervisorExpenses, addAdvance, addPayout,
    setProjectLocation, setProjectNotes, addProjectDoc, removeProjectDoc, hydrateProject,
  } = useWorkforceStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('overview');
  const [toast, setToast] = useState('');
  const [period, setPeriod] = useState<PeriodKind>('week');
  const [calcOpen, setCalcOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [paySearch, setPaySearch] = useState(''); // filter payroll by worker name (scales to 100s)

  // The project to show comes from the URL (its real backend prjct_id) — so tapping a
  // site/project always opens THAT project, never a stale local one. Its name is read
  // from the backend project list and mirrored into the board store.
  const { id: routeId = '' } = useParams<{ id: string }>();
  const history = useHistory();
  const { data: backendProjects = [] } = useQuery({ queryKey: ['workforce', 'projects'], queryFn: () => workforceApi.projects() });
  const backendName = (backendProjects as any[]).find((p) => String(p.prjct_id) === String(routeId))?.nm_tx as string | undefined;
  const activeProjectId = routeId;
  useEffect(() => {
    if (routeId) ensureProject(routeId, backendName ?? 'Project');
  }, [routeId, backendName, ensureProject]);

  // Two-way sync: pull server truth for this project (workers/supervisors/attendance
  // created on other devices) and merge it into the board. Own records are recognised
  // via the id-map and not duplicated; unsynced local marks are preserved.
  const wfSupsQ = useQuery({ queryKey: ['wf-sups', routeId], queryFn: () => workforceApi.supervisors(routeId), enabled: !!routeId });
  const wfWorkersQ = useQuery({ queryKey: ['wf-workers', routeId], queryFn: () => workforceApi.workers(routeId), enabled: !!routeId });
  const wfAttQ = useQuery({ queryKey: ['wf-att', routeId], queryFn: () => workforceApi.attendance(routeId), enabled: !!routeId });
  useEffect(() => {
    if (!routeId) return;
    hydrateProject(routeId, { supervisors: wfSupsQ.data, workers: wfWorkersQ.data, attendance: wfAttQ.data });
  }, [routeId, wfSupsQ.data, wfWorkersQ.data, wfAttQ.data, hydrateProject]);

  // Everything below is scoped to the active project.
  const activeProject = projects.find((p) => p.id === activeProjectId)
    ?? (activeProjectId ? { id: activeProjectId, name: backendName ?? 'Project' } : projects[0]);
  const supervisors = allSupervisors.filter((s) => s.projectId === activeProjectId);
  const workers = allWorkers.filter((w) => w.projectId === activeProjectId);
  const expenses = allExpenses.filter((e) => e.projectId === activeProjectId);
  const payouts = allPayouts.filter((p) => p.projectId === activeProjectId);

  // Active pay period — drives the Payroll tab (weekly/monthly settlement).
  const range = periodRange(period);
  const inPeriod = (d?: string) => !!d && (!range.start || d >= range.start) && (!range.end || d <= range.end);

  // dialogs
  const [supAlert, setSupAlert] = useState(false);
  const [supForm, setSupForm] = useState({ name: '', phone: '', site: '', dayRate: '', photo: '' });
  // Editing an existing supervisor (null = add mode).
  const [supEditId, setSupEditId] = useState<string | null>(null);
  const openEditSupervisor = (s: any) => {
    setSupForm({ name: s.name || '', phone: s.phone || '', site: s.site || '', dayRate: s.dayRate ? String(s.dayRate) : '', photo: s.photo || '' });
    setSupEditId(s.id); setSupAlert(true);
  };
  // Add-worker dialog. supervisorId === '' → a direct worker with no supervisor.
  const [workerDialog, setWorkerDialog] = useState<{ supervisorId: string } | null>(null);
  const emptyWorkerForm = { name: '', trade: '', phone: '', rate: '', photo: '' };
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm);
  /** Open the Add-Worker sheet with a FRESH form — never carry over the last worker's values. */
  const openWorker = (supervisorId: string) => { setWorkerForm(emptyWorkerForm); setWorkerDialog({ supervisorId }); };
  const [linkSheet, setLinkSheet] = useState(false);
  // The existing person being linked into this project (rate-confirm dialog).
  const [linkPerson, setLinkPerson] = useState<ManagedWorker | null>(null);
  const [expenseCat, setExpenseCat] = useState<ExpenseCategory | null>(null);
  const [catSheet, setCatSheet] = useState(false);
  const [pendingCat, setPendingCat] = useState<ExpenseCategory | null>(null);
  const [payerSheet, setPayerSheet] = useState(false);
  // Supervisor who paid for the bill being added ('' = company / builder paid).
  const [expensePaidBy, setExpensePaidBy] = useState<string>('');
  const [otWorker, setOtWorker] = useState<string | null>(null);
  const [advWorker, setAdvWorker] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  // Geofenced attendance: the marker's GPS is verified once per day against the
  // saved site location before any worker can be marked (anti-cheat).
  const [locVerified, setLocVerified] = useState<{ dateKey: string; lat: number; lng: number; dist: number } | null>(null);
  const [verifying, setVerifying] = useState(false);
  // Flats/units editor: id of the unit being edited, or 'new' to add.
  const [unitEdit, setUnitEdit] = useState<string | 'new' | null>(null);
  const emptyUnitForm = { floor: '', number: '', unitType: '', areaSqft: '', price: '', status: 'available' as UnitStatus, buyerName: '', buyerPhone: '', amountReceived: '' };
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const unitFileInput = useRef<HTMLInputElement>(null);
  // Multi-site: worker being shifted to another site.
  const [moveWorkerId, setMoveWorkerId] = useState<string | null>(null);

  const todayMarks = attendance[TODAY_KEY] ?? {};
  const todayMeta = attendanceMeta[TODAY_KEY] ?? {};
  const todayOt = overtime[TODAY_KEY] ?? {};
  // Location is "verified" for marking only if it was checked today.
  const verifiedToday = locVerified?.dateKey === TODAY_KEY ? locVerified : null;
  const presentToday = workers.filter((w) => todayMarks[w.id] === 'P').length;
  // Workers added directly, without a supervisor.
  const directWorkers = workers.filter((w) => !w.supervisorId);
  // People already in this project (by shared identity) — used to offer linking others in.
  const personIdsHere = new Set(workers.map((w) => w.personId));
  const peopleElsewhere = allWorkers.filter((w, i, arr) =>
    w.projectId !== activeProjectId && !personIdsHere.has(w.personId) && arr.findIndex((x) => x.personId === w.personId) === i);
  const projectName = (pid: string) => projects.find((p) => p.id === pid)?.name ?? '—';
  // Reimbursement owed to each supervisor for bills they paid out of pocket.
  const supOwed = supervisors
    .map((s) => ({ sup: s, amount: expenses.filter((e) => e.paidBy === s.id && !e.settled).reduce((sum, e) => sum + e.amount, 0) }))
    .filter((o) => o.amount > 0);
  // Attendance is grouped by supervisor, plus a group for direct workers.
  const attendanceGroups = [
    ...supervisors.map((s) => ({ key: s.id, title: `${s.name}'s team`, team: workers.filter((w) => w.supervisorId === s.id) })),
    { key: '__direct__', title: t('wf.noSupervisor', 'No supervisor'), team: directWorkers },
  ].filter((g) => g.team.length);

  // payroll: count P (1) + H (0.5) across recorded days. Pass `inPeriod` to scope
  // to the active pay period; omit it for all-time (Overview, worker lifetime).
  const ALL = () => true;
  const daysWorked = (wid: string, ok: (d: string) => boolean = ALL) =>
    Object.entries(attendance).reduce((s, [d, day]) => s + (ok(d) ? (day[wid] === 'P' ? 1 : day[wid] === 'H' ? 0.5 : 0) : 0), 0);
  const otHours = (wid: string, ok: (d: string) => boolean = ALL) =>
    Object.entries(overtime).reduce((s, [d, day]) => s + (ok(d) ? (day[wid] ?? 0) : 0), 0);
  /** OT paid at 1.5× the hourly rate (day rate / 8). */
  const otPay = (wid: string, rate: number, ok: (d: string) => boolean = ALL) => Math.round(otHours(wid, ok) * (rate / 8) * 1.5);
  const advanceOf = (wid: string, ok: (d: string) => boolean = ALL) =>
    advances.filter((a) => a.workerId === wid && ok(a.dateKey ?? TODAY_KEY)).reduce((s, a) => s + a.amount, 0);
  /** Wages already paid to a worker for a specific settled period instance. */
  const paidOf = (wid: string, periodKey: string) =>
    payouts.filter((p) => p.workerId === wid && p.periodKey === periodKey).reduce((s, p) => s + p.amount, 0);
  const grossOf = (w: { id: string; dayRate: number }, ok: (d: string) => boolean = ALL) => daysWorked(w.id, ok) * w.dayRate + otPay(w.id, w.dayRate, ok);
  const netOf = (w: { id: string; dayRate: number }) => grossOf(w) - advanceOf(w.id);

  const totals = useMemo(() => {
    const gross = workers.reduce((s, w) => s + grossOf(w), 0);
    const advanceTotal = workers.reduce((s, w) => s + advanceOf(w.id), 0);
    const wageBill = gross - advanceTotal; // net payable
    const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const byCat = expenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {});
    return { gross, advanceTotal, wageBill, expenseTotal, byCat, projectCost: gross + expenseTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers, expenses, attendance, overtime, advances]);

  const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const supName = (id: string) => supervisors.find((s) => s.id === id)?.name ?? '—';

  // ----- Files & location -----
  const fileInput = useRef<HTMLInputElement>(null);
  const docs = activeProject?.documents ?? [];
  const captureLocation = () => {
    if (!navigator.geolocation) { setToast('Location not supported on this device'); return; }
    setToast('Getting current location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setProjectLocation(activeProjectId, point); // save coords immediately
        const label = await reverseGeocode(point); // then resolve the human area name
        setProjectLocation(activeProjectId, { ...point, label });
        setToast('Project location saved 📍');
      },
      () => setToast('Could not get location — check permission'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /** Verify the marker is physically at the site before letting them mark attendance.
   *  First time (no site pin yet) → the current spot BECOMES the site anchor.
   *  After that → must be within GEOFENCE_M metres of that anchor. */
  const verifyAttendanceLocation = () => {
    if (!navigator.geolocation) { setToast('Location not supported on this device'); return; }
    setVerifying(true);
    setToast('Checking your location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const anchor = activeProject?.location;
        if (!anchor) {
          // First-ever mark for this site: pin the current spot as the site location.
          setProjectLocation(activeProjectId, here);
          reverseGeocode(here).then((label) => setProjectLocation(activeProjectId, { ...here, label })).catch(() => {});
          setLocVerified({ dateKey: TODAY_KEY, ...here, dist: 0 });
          setToast('Site location set — you can mark attendance 📍');
        } else {
          const dist = Math.round(haversineM(here, anchor));
          if (dist <= GEOFENCE_M) {
            setLocVerified({ dateKey: TODAY_KEY, ...here, dist });
            setToast(`Location verified · ${dist}m from site ✓`);
          } else {
            setLocVerified(null);
            setToast(`You're ${dist}m from the site — move within ${GEOFENCE_M}m to mark attendance`);
          }
        }
        setVerifying(false);
      },
      () => { setVerifying(false); setToast('Could not get location — check permission'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /** Mark a worker, stamping the verified time + location for the builder's audit. */
  const markWithGeo = (workerId: string, m: AttendanceMark) => {
    if (!verifiedToday) { setToast('Verify your location first to mark attendance'); return; }
    mark(TODAY_KEY, workerId, m, { at: Date.now(), lat: verifiedToday.lat, lng: verifiedToday.lng, dist: verifiedToday.dist });
  };

  // ---- Flats / units (backed by the shared backend, /api/workforce/.../units) ----
  const qc = useQueryClient();
  const unitsQ = useQuery({ queryKey: ['wf-units', activeProjectId], queryFn: () => workforceApi.units(activeProjectId), enabled: !!activeProjectId });
  const units: Unit[] = (unitsQ.data ?? []).map((r: any) => ({
    id: String(r.unit_id), projectId: String(r.prjct_id), floor: Number(r.floor_no) || 0, number: r.flat_no_tx,
    unitType: r.unit_type_tx || undefined, areaSqft: r.area_sqft != null ? Number(r.area_sqft) : undefined,
    price: r.price_am != null ? Number(r.price_am) : undefined, status: (r.sts_cd || 'available') as UnitStatus,
    buyerName: r.buyer_nm_tx || undefined, buyerPhone: r.buyer_phone_tx || undefined,
    amountReceived: r.amt_rcvd_am != null ? Number(r.amt_rcvd_am) : undefined,
    documents: Number(r.doc_count) ? Array.from({ length: Number(r.doc_count) }, (_, i) => ({ id: String(i), name: '', dataUrl: '', addedAt: '' })) : undefined,
  }));
  const invalidateUnits = () => qc.invalidateQueries({ queryKey: ['wf-units', activeProjectId] });
  const addUnitMut = useMutation({ mutationFn: (b: any) => workforceApi.addUnit(activeProjectId, b), onSuccess: () => { invalidateUnits(); setToast('Flat added'); setUnitEdit(null); }, onError: (e: any) => setToast(e.message || 'Failed') });
  const updateUnitMut = useMutation({ mutationFn: (v: { id: string; b: any }) => workforceApi.updateUnit(v.id, v.b), onSuccess: () => { invalidateUnits(); setToast('Flat updated'); setUnitEdit(null); }, onError: (e: any) => setToast(e.message || 'Failed') });
  const removeUnitMut = useMutation({ mutationFn: (id: string) => workforceApi.removeUnit(id), onSuccess: () => { invalidateUnits(); setToast('Flat removed'); setUnitEdit(null); }, onError: (e: any) => setToast(e.message || 'Failed') });
  // Docs for the unit currently open in the editor
  const unitDocsQ = useQuery({ queryKey: ['wf-unit-docs', unitEdit], queryFn: () => workforceApi.unitDocs(unitEdit as string), enabled: !!unitEdit && unitEdit !== 'new' });
  const addUnitDocMut = useMutation({
    mutationFn: async (file: File) => { const up = await filesApi.uploadFile('unit_doc', file); return workforceApi.addUnitDoc(unitEdit as string, { name: file.name, url: await filesApi.signedUrl(up.kind, up.id) }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wf-unit-docs', unitEdit] }); invalidateUnits(); setToast('Document added'); },
    onError: (e: any) => setToast(e.message || 'Upload failed'),
  });
  const removeUnitDocMut = useMutation({ mutationFn: (docId: number) => workforceApi.removeUnitDoc(docId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['wf-unit-docs', unitEdit] }); invalidateUnits(); }, onError: (e: any) => setToast(e.message || 'Failed') });

  // ---- Staged project documents (approvals → construction → completion → sales) ----
  const projDocsQ = useQuery({ queryKey: ['wf-proj-docs', activeProjectId], queryFn: () => workforceApi.projectDocs(activeProjectId), enabled: !!activeProjectId });
  const projDocs: any[] = projDocsQ.data ?? [];
  const docFileInput = useRef<HTMLInputElement>(null);
  const [pendingDoc, setPendingDoc] = useState<{ stage: string; kind: string; label: string } | null>(null);
  const addProjDocMut = useMutation({
    mutationFn: async (v: { file: File; stage: string; kind: string; name: string }) => { const up = await filesApi.uploadFile('project_doc', v.file); return workforceApi.addProjectDoc(activeProjectId, { stage: v.stage, kind: v.kind, name: v.name, url: await filesApi.signedUrl(up.kind, up.id) }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wf-proj-docs', activeProjectId] }); setToast('Document uploaded'); },
    onError: (e: any) => setToast(e.message || 'Upload failed'),
  });
  const removeProjDocMut = useMutation({ mutationFn: (id: number) => workforceApi.removeProjectDoc(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['wf-proj-docs', activeProjectId] }); }, onError: (e: any) => setToast(e.message || 'Failed') });
  const triggerDocUpload = (stage: string, kind: string, label: string) => { setPendingDoc({ stage, kind, label }); docFileInput.current?.click(); };
  const onPickProjDoc = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && pendingDoc) addProjDocMut.mutate({ file, stage: pendingDoc.stage, kind: pendingDoc.kind, name: pendingDoc.label }); setPendingDoc(null); e.target.value = ''; };

  const openAddUnit = () => { setUnitForm(emptyUnitForm); setUnitEdit('new'); };
  const openEditUnit = (u: Unit) => {
    setUnitForm({
      floor: String(u.floor ?? ''), number: u.number ?? '', unitType: u.unitType ?? '',
      areaSqft: u.areaSqft ? String(u.areaSqft) : '', price: u.price ? String(u.price) : '',
      status: u.status, buyerName: u.buyerName ?? '', buyerPhone: u.buyerPhone ?? '',
      amountReceived: u.amountReceived ? String(u.amountReceived) : '',
    });
    setUnitEdit(u.id);
  };
  const saveUnit = () => {
    if (!unitForm.number.trim()) { setToast('Enter a flat number'); return; }
    const body: any = {
      floor: Number(unitForm.floor) || 0,
      number: unitForm.number.trim(),
      unitType: unitForm.unitType.trim() || undefined,
      areaSqft: Number(unitForm.areaSqft) || undefined,
      price: Number(unitForm.price) || undefined,
      status: unitForm.status,
      buyerName: unitForm.buyerName.trim() || undefined,
      buyerPhone: unitForm.buyerPhone.trim() || undefined,
      amountReceived: Number(unitForm.amountReceived) || undefined,
    };
    if (unitForm.status === 'booked') body.bookedOn = new Date().toISOString().slice(0, 10);
    if (unitForm.status === 'sold') body.soldOn = new Date().toISOString().slice(0, 10);
    if (unitForm.status === 'registered') body.registeredOn = new Date().toISOString().slice(0, 10);
    if (unitEdit === 'new') addUnitMut.mutate(body);
    else if (unitEdit) updateUnitMut.mutate({ id: unitEdit, b: body });
  };
  const onPickUnitDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !unitEdit || unitEdit === 'new') return;
    addUnitDocMut.mutate(file);
    e.target.value = '';
  };
  // Sales rollup for the header
  const unitsSold = units.filter((u) => u.status === 'sold' || u.status === 'registered').length;
  const salesRevenue = units.reduce((s, u) => s + (u.amountReceived || 0), 0);
  const inventoryValue = units.reduce((s, u) => s + (u.price || 0), 0);
  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const isImg = f.type.startsWith('image/');
      const reader = new FileReader();
      // Store the data URL for every file so it can be re-downloaded later.
      reader.onload = () => addProjectDoc(activeProjectId, {
        name: f.name, kind: isImg ? 'image' : 'file',
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        size: f.size, addedAt: TODAY_LABEL,
      });
      reader.readAsDataURL(f);
    });
    if (files.length) setToast(`${files.length} file${files.length > 1 ? 's' : ''} saved`);
    e.target.value = '';
  };
  const downloadDoc = (doc: { name: string; dataUrl?: string }) => {
    if (!doc.dataUrl) { setToast('No saved copy to download'); return; }
    const a = document.createElement('a');
    a.href = doc.dataUrl; a.download = doc.name;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <PageShell title={activeProject?.name ?? t('wf.project', 'Project')} showBack>
      {/* sub-nav — solid sticky bar (opaque so content doesn't bleed through) */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 11px', position: 'sticky', top: 0, zIndex: 10, background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)', boxShadow: '0 4px 12px rgba(22,24,29,0.05)' }}>
        {TABS.map((tk) => (
          <button key={tk.key} onClick={() => setTab(tk.key)} style={pill(tab === tk.key)}>{t(`wf.tab_${tk.key}`, tk.label)}</button>
        ))}
      </div>

      <div style={{ height: 14 }} />
      <SyncStatusPill />
      <AnimatedPage>
        {/* ---------- OVERVIEW ---------- */}
        {tab === 'overview' && (
          <div style={{ padding: '0 10px 24px' }}>
            {/* compact stat row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { label: t('wf.supervisors', 'Supervisors'), value: supervisors.length, color: 'var(--anrix-primary-strong)' },
                { label: t('wf.workers', 'Workers'), value: workers.length, color: 'var(--anrix-text-strong)' },
                { label: t('wf.present', 'Present'), value: `${presentToday}/${workers.length}`, color: 'var(--anrix-success)' },
              ].map((s) => (
                <div key={s.label} className="anrix-card" style={{ flex: 1, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--anrix-text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: '26px', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 'var(--anrix-radius-lg)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', marginBottom: 12 }}>
              <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 12.5 }}>{t('wf.totalProjectCostSoFar', 'Total project cost so far')}</div>
              <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--anrix-hero-accent)' }}>{rupee(totals.projectCost)}</div>
              <div style={{ display: 'flex', gap: 18, marginTop: 6, fontSize: 12.5 }}>
                <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('wf.wages', 'Wages')} <strong>{rupee(totals.gross)}</strong></span>
                <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('wf.materialsAndBills', 'Materials & bills')} <strong>{rupee(totals.expenseTotal)}</strong></span>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 14, margin: '4px 2px 8px' }}>{t('wf.costBreakdown', 'Cost breakdown')}</div>
            <div className="anrix-card" style={{ padding: '4px 14px' }}>
              {[...Object.entries(totals.byCat).map(([cat, amt]) => ({ emoji: EXPENSE_META[cat as ExpenseCategory].emoji, label: EXPENSE_META[cat as ExpenseCategory].label, amt })),
                { emoji: '💸', label: t('wf.labourWages', 'Labour wages'), amt: totals.gross }].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{row.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{row.label}</span>
                  <strong style={{ fontSize: 14 }}>{rupee(row.amt)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- TEAM (hierarchy) ---------- */}
        {tab === 'team' && (
          <div style={{ padding: '0 10px 24px' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: peopleElsewhere.length ? 10 : 14 }}>
              <GradientButton icon={addOutline} onClick={() => { setSupForm({ name: '', phone: '', site: '', dayRate: '', photo: '' }); setSupEditId(null); setSupAlert(true); }} style={{ flex: 1 }}>{t('wf.addSupervisor', 'Add Supervisor')}</GradientButton>
              <GradientButton variant="outline" icon={addOutline} onClick={() => openWorker('')} style={{ flex: 1 }}>{t('wf.addWorker', 'Add Worker')}</GradientButton>
            </div>
            {peopleElsewhere.length > 0 && (
              <button onClick={() => setLinkSheet(true)} style={{ ...addRowBtn, width: '100%', justifyContent: 'center', marginTop: 0, marginBottom: 14 }}>
                <IonIcon icon={peopleOutline} /> {t('wf.addWorkerFromAnotherProject', 'Add worker from another project')}
              </button>
            )}

            {/* Direct workers — not under any supervisor */}
            {directWorkers.length > 0 && (
              <Reveal>
                <div className="anrix-card" style={{ marginBottom: 14, padding: 14 }}>
                  <div className="anrix-muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {directWorkers.length} worker{directWorkers.length > 1 ? 's' : ''} · no supervisor
                  </div>
                  {directWorkers.map((w) => (
                    <div key={w.id} onClick={() => setProfileId(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar name={w.name} src={w.photo} size={38} />
                        <span style={{ position: 'absolute', bottom: -3, right: -4, fontSize: 14 }}>{w.emoji}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                        <div className="anrix-muted" style={{ fontSize: 12 }}>{w.trade} · ₹{w.dayRate}/day</div>
                      </div>
                      <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16 }} />
                      <button onClick={(e) => { e.stopPropagation(); removeWorker(w.id); }} style={iconBtn}><IonIcon icon={trashOutline} style={{ color: 'var(--anrix-text-muted)', fontSize: 18 }} /></button>
                    </div>
                  ))}
                  <button onClick={() => openWorker('')} style={addRowBtn}><IonIcon icon={addOutline} /> {t('wf.addWorkerRow', 'Add worker')}</button>
                </div>
              </Reveal>
            )}

            {supervisors.map((s) => {
              const team = workers.filter((w) => w.supervisorId === s.id);
              return (
                <Reveal key={s.id}>
                  <div className="anrix-card" style={{ marginBottom: 14, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s.name} src={s.photo} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{s.name} <Badge tone="primary">{t('wf.supervisor', 'Supervisor')}</Badge></div>
                        <div className="anrix-muted" style={{ fontSize: 12.5, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span><IonIcon icon={locationOutline} style={{ verticalAlign: '-2px' }} /> {s.site}</span>
                          <span><IonIcon icon={callOutline} style={{ verticalAlign: '-2px' }} /> {s.phone}</span>
                          {s.dayRate ? <span><IonIcon icon={cashOutline} style={{ verticalAlign: '-2px' }} /> {rupee(s.dayRate)}/day</span> : null}
                        </div>
                      </div>
                      <button onClick={() => openEditSupervisor(s)} style={iconBtn} title={t('wf.edit', 'Edit')}><IonIcon icon={createOutline} style={{ color: 'var(--anrix-primary-strong)' }} /></button>
                      <button onClick={() => removeSupervisor(s.id)} style={iconBtn}><IonIcon icon={trashOutline} style={{ color: 'var(--anrix-danger)' }} /></button>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--anrix-border)' }}>
                      <div className="anrix-muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('wf.nWorkers', '{{n}} workers', { n: team.length })}</div>
                      {team.map((w) => (
                        <div key={w.id} onClick={() => setProfileId(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <Avatar name={w.name} src={w.photo} size={38} />
                            <span style={{ position: 'absolute', bottom: -3, right: -4, fontSize: 14 }}>{w.emoji}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                            <div className="anrix-muted" style={{ fontSize: 12 }}>{w.trade} · ₹{w.dayRate}/day</div>
                          </div>
                          <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16 }} />
                          <button onClick={(e) => { e.stopPropagation(); removeWorker(w.id); }} style={iconBtn}><IonIcon icon={trashOutline} style={{ color: 'var(--anrix-text-muted)', fontSize: 18 }} /></button>
                        </div>
                      ))}
                      <button onClick={() => openWorker(s.id)} style={addRowBtn}><IonIcon icon={addOutline} /> Add worker</button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* ---------- ATTENDANCE ---------- */}
        {tab === 'attendance' && (
          <div style={{ padding: '0 10px 24px' }}>
            <div className="anrix-card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
              <span style={{ fontWeight: 700 }}>📅 {TODAY_LABEL}</span>
              <Badge tone="success">{presentToday}/{workers.length} {t('wf.presentLower', 'present')}</Badge>
            </div>
            {/* Management dashboard — KPIs, needs-attention inbox, and the reports hub */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/dashboard`)} style={{
              width: '100%', marginBottom: 10, padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
              border: 'none', background: 'linear-gradient(180deg, #f5b301 0%, #e3a306 100%)', color: 'var(--anrix-on-primary, #15171c)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: 15,
            }}>
              <span>📊 {t('wf.projectDashboard', 'Project Dashboard')}</span>
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{t('wf.kpisAlertsReports', 'KPIs · alerts · reports ›')}</span>
            </button>
            {/* Digital muster roll — the statutory monthly register + geo-verified/flagged split */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/muster`)} style={{
              width: '100%', marginBottom: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>📋 {t('wf.musterRoll', 'Muster Roll')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.monthlyRegisterExport', 'Monthly register · export ›')}</span>
            </button>
            {/* Contractor billing — reconcile a contractor's claim against the muster */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/contractors`)} style={{
              width: '100%', marginBottom: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>🧾 {t('wf.contractorBilling', 'Contractor Billing')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.reconcileVsMuster', 'Reconcile vs muster ›')}</span>
            </button>
            {/* Site cashbook — day book of cash in / out with running cash-in-hand */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/cashbook`)} style={{
              width: '100%', marginBottom: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>💰 {t('wf.cashbook', 'Cashbook')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.cashInOut', 'Cash in / out ›')}</span>
            </button>
            {/* Statutory compliance — PF / ESI / BOCW run for the month */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/compliance`)} style={{
              width: '100%', marginBottom: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>🏛️ {t('wf.pfEsiBocw', 'PF / ESI / BOCW')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.statutoryRun', 'Statutory run ›')}</span>
            </button>
            {/* Daily progress report + budget-vs-actual cost */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/progress`)} style={{
              width: '100%', marginBottom: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>📈 {t('wf.progressCost', 'Progress & Cost')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.dprBudget', 'DPR · budget ›')}</span>
            </button>
            {/* Safety & incident reporting */}
            <button onClick={() => history.push(`/app/workforce/board/${activeProjectId}/safety`)} style={{
              width: '100%', marginBottom: 12, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            }}>
              <span>🦺 {t('wf.safety', 'Safety')}</span>
              <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('wf.incidentsPpe', 'Incidents · PPE ›')}</span>
            </button>

            {/* Location gate — must be verified at the site before marking (anti-cheat) */}
            {verifiedToday ? (
              <div style={{ marginBottom: 12, padding: '11px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid var(--anrix-success)', background: 'color-mix(in srgb, var(--anrix-success) 12%, transparent)' }}>
                <IonIcon icon={checkmarkCircle} style={{ fontSize: 20, color: 'var(--anrix-success)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <div style={{ fontWeight: 800, color: 'var(--anrix-success)' }}>{t('wf.locationVerified', 'Location verified')}</div>
                  <div className="anrix-muted" style={{ fontSize: 12 }}>
                    {activeProject?.location?.label ? `${activeProject.location.label} · ` : ''}{verifiedToday.dist}m {t('wf.fromSite', 'from site')}
                  </div>
                </div>
                <button onClick={verifyAttendanceLocation} className="anrix-muted" style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('wf.recheck', 'Re-check')}</button>
              </div>
            ) : (
              <button onClick={verifyAttendanceLocation} disabled={verifying} style={{
                width: '100%', marginBottom: 12, padding: '13px 14px', borderRadius: 12, cursor: verifying ? 'wait' : 'pointer',
                border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)',
                display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 14, color: 'var(--anrix-primary-strong)',
              }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 20, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {verifying ? t('wf.checkingLocation', 'Checking your location…')
                    : activeProject?.location ? t('wf.verifyLocationToMark', 'Verify your location to mark attendance')
                    : t('wf.setSiteLocationToStart', 'Set this site’s location to start marking')}
                </span>
                <IonIcon icon={locationOutline} style={{ fontSize: 18, flexShrink: 0 }} />
              </button>
            )}
            {attendanceGroups.map((g) => {
              const team = g.team;
              return (
                <div key={g.key} style={{ marginBottom: 14 }}>
                  <div className="anrix-muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 8px' }}>{g.title}</div>
                  <div className="anrix-card" style={{ padding: '4px 12px' }}>
                    {team.map((w, i) => {
                      const cur = todayMarks[w.id];
                      return (
                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                          <span style={{ fontSize: 19 }}>{w.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                            <div className="anrix-muted" style={{ fontSize: 11.5 }}>
                              {w.trade}
                              {todayMeta[w.id]?.at && (
                                <> · <IonIcon icon={timeOutline} style={{ verticalAlign: '-2px', fontSize: 12 }} /> {fmtTime(todayMeta[w.id].at)}
                                  {typeof todayMeta[w.id].dist === 'number' && <> · {todayMeta[w.id].dist}m</>}
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {MARKS.map((mk) => {
                              const on = cur === mk.m;
                              return (
                                <button key={mk.m} disabled={!verifiedToday} onClick={() => markWithGeo(w.id, mk.m)} title={verifiedToday ? t(`wf.mark_${mk.m}`, mk.label) : 'Verify location to mark'} style={{
                                  width: 32, height: 32, borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: verifiedToday ? 'pointer' : 'not-allowed',
                                  border: on ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
                                  background: on ? colorFor(mk.tone) : 'var(--anrix-surface)',
                                  color: on ? '#fff' : 'var(--anrix-text-muted)',
                                  opacity: verifiedToday ? 1 : 0.45,
                                }}>{mk.m}</button>
                              );
                            })}
                            {/* Overtime — extra work hours */}
                            <button onClick={() => setOtWorker(w.id)} title={t('wf.overtime', 'Overtime')} style={{
                              height: 32, padding: '0 8px', borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                              border: todayOt[w.id] ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
                              background: todayOt[w.id] ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                              color: todayOt[w.id] ? '#fff' : 'var(--anrix-text-muted)',
                            }}>{todayOt[w.id] ? `OT ${todayOt[w.id]}h` : '+OT'}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- FLATS / UNITS ---------- */}
        {tab === 'flats' && (
          <div style={{ padding: '0 10px 24px' }}>
            {/* Sales summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <StatCard icon="🏠" label={t('wf.flats', 'Flats')} value={`${unitsSold}/${units.length}`} tone="blue" />
              <StatCard icon="💰" label={t('wf.received', 'Received')} value={rupee(salesRevenue)} tone="green" />
              <StatCard icon="🏷️" label={t('wf.inventory', 'Inventory')} value={rupee(inventoryValue)} tone="amber" />
            </div>

            <button onClick={openAddUnit} style={{
              width: '100%', marginBottom: 14, padding: '13px 14px', borderRadius: 12, cursor: 'pointer',
              border: '1.5px dashed var(--anrix-primary)', background: 'var(--anrix-primary-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 14, color: 'var(--anrix-primary-strong)',
            }}>
              <IonIcon icon={addOutline} style={{ fontSize: 18 }} /> {t('wf.addFlat', 'Add flat / unit')}
            </button>

            {units.length === 0 ? (
              <div className="anrix-muted" style={{ textAlign: 'center', padding: '30px 0', fontSize: 14 }}>
                {t('wf.noFlatsYet', 'No flats yet. Add each unit (floor + flat no), then track booking, sale, registration & documents.')}
              </div>
            ) : (
              Object.entries(units.reduce((acc, u) => { (acc[u.floor] ??= []).push(u); return acc; }, {} as Record<number, Unit[]>))
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([floor, list]) => (
                  <div key={floor} style={{ marginBottom: 14 }}>
                    <div className="anrix-muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 8px' }}>
                      {t('wf.floor', 'Floor')} {floor}
                    </div>
                    <div className="anrix-card" style={{ padding: '4px 12px' }}>
                      {list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })).map((u, i) => (
                        <div key={u.id} onClick={() => openEditUnit(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none', cursor: 'pointer' }}>
                          <span style={{ width: 44, height: 44, borderRadius: 10, background: unitTone(u.status).bg, color: unitTone(u.status).fg, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{u.number}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.unitType || t('wf.flat', 'Flat')} {u.areaSqft ? `· ${u.areaSqft} sqft` : ''}</div>
                            <div className="anrix-muted" style={{ fontSize: 12 }}>
                              {u.price ? rupee(u.price) : t('wf.priceNotSet', 'price not set')}
                              {u.buyerName ? ` · ${u.buyerName}` : ''}
                              {u.documents?.length ? ` · ${u.documents.length} 📎` : ''}
                            </div>
                          </div>
                          <Badge tone={unitTone(u.status).badge}>{t(`wf.unit_${u.status}`, u.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ---------- DOCUMENTS (staged approval → completion → sales checklist) ---------- */}
        {tab === 'docs' && (
          <div style={{ padding: '0 10px 24px' }}>
            <input ref={docFileInput} type="file" accept="image/*,application/pdf" onChange={onPickProjDoc} style={{ display: 'none' }} />
            {(() => {
              const total = DOC_STAGES.reduce((n, st) => n + st.items.length, 0);
              const have = new Set(projDocs.map((d) => d.kind_cd)).size;
              return (
                <div className="anrix-card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                  <span style={{ fontWeight: 700 }}>📁 {t('wf.complianceDocs', 'Compliance documents')}</span>
                  <Badge tone={have >= total ? 'success' : 'warning'}>{have}/{total} {t('wf.onFile', 'on file')}</Badge>
                </div>
              );
            })()}
            {addProjDocMut.isPending && <div className="anrix-muted" style={{ fontSize: 12, marginBottom: 8 }}>{t('wf.uploading', 'Uploading…')}</div>}

            {DOC_STAGES.map((stage) => (
              <div key={stage.key} style={{ marginBottom: 16 }}>
                <div className="anrix-muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 8px' }}>{t(`wf.stage_${stage.key}`, stage.label)}</div>
                <div className="anrix-card" style={{ padding: '4px 12px' }}>
                  {stage.items.map((item, i) => {
                    const uploaded = projDocs.filter((d) => d.kind_cd === item.kind);
                    return (
                      <div key={item.kind} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <IonIcon icon={uploaded.length ? checkmarkCircle : documentOutline} style={{ fontSize: 20, color: uploaded.length ? 'var(--anrix-success)' : 'var(--anrix-text-muted)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                            {!uploaded.length && <div className="anrix-muted" style={{ fontSize: 11.5 }}>{t('wf.notUploaded', 'Not uploaded')}</div>}
                          </div>
                          <button onClick={() => triggerDocUpload(stage.key, item.kind, item.label)} style={{ ...addRowBtn, marginTop: 0 }}>
                            <IonIcon icon={cloudUploadOutline} /> {uploaded.length ? t('wf.addMore', 'Add') : t('wf.upload', 'Upload')}
                          </button>
                        </div>
                        {uploaded.map((doc) => (
                          <div key={doc.doc_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 0 30px' }}>
                            <a href={doc.url_tx} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12.5, color: 'var(--anrix-primary-strong)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nm_tx}</a>
                            <button onClick={() => removeProjDocMut.mutate(doc.doc_id)} style={iconBtn}><IonIcon icon={trashOutline} style={{ color: 'var(--anrix-danger)', fontSize: 16 }} /></button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------- PAYROLL ---------- */}
        {tab === 'payroll' && (() => {
          // Per-worker figures for the selected pay period.
          const rows = workers.map((w) => {
            const gross = grossOf(w, inPeriod);
            const adv = advanceOf(w.id, inPeriod);
            const paid = paidOf(w.id, range.key);
            const net = gross - adv - paid;
            return { w, days: daysWorked(w.id, inPeriod), ot: otHours(w.id, inPeriod), otAmt: otPay(w.id, w.dayRate, inPeriod), gross, adv, paid, net };
          });
          const remaining = rows.reduce((s, r) => s + Math.max(0, r.net), 0);
          const periodGross = rows.reduce((s, r) => s + r.gross, 0);
          const periodAdv = rows.reduce((s, r) => s + r.adv, 0);
          const payAll = () => {
            const unpaid = rows.filter((r) => r.net > 0);
            if (!unpaid.length) { setToast('Everyone is already settled for this period'); return; }
            unpaid.forEach((r) => addPayout({ projectId: activeProjectId, workerId: r.w.id, amount: r.net, periodKey: range.key, date: TODAY_LABEL, dateKey: TODAY_KEY }));
            setToast(`Paid ${rupee(remaining)} to ${unpaid.length} worker${unpaid.length > 1 ? 's' : ''} ✓`);
          };
          return (
          <div style={{ padding: '0 10px 24px' }}>
            {/* compact filter row: period segmented control */}
            <div className="no-scrollbar" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {PERIOD_OPTS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={periodPill(period === p.key)}>{t(`wf.period_${p.key}`, p.label)}</button>
              ))}
            </div>

            {/* slim summary bar — Pay all inline so the worker list gets the space */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--anrix-hero-muted)' }}>{t('wf.stillToPay', 'Still to pay')} · {range.label}</div>
                <div style={{ fontSize: 21, fontWeight: 800, lineHeight: '25px', color: 'var(--anrix-hero-accent)' }}>{rupee(remaining)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--anrix-hero-muted)', marginTop: 1 }}>Gross {rupee(periodGross)} · Adv −{rupee(periodAdv)}</div>
              </div>
              {remaining > 0 && (
                <button onClick={payAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <IonIcon icon={cashOutline} /> {t('wf.payAll', 'Pay all')}
                </button>
              )}
            </div>

            {/* Search — scales to hundreds of workers (type a name instead of scrolling) */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <IonIcon icon={searchOutline} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--anrix-text-muted)', fontSize: 17 }} />
              <input value={paySearch} onChange={(e) => setPaySearch(e.target.value)} placeholder={t('wf.searchNWorkers', 'Search {{n}} workers…', { n: rows.length })}
                style={{ width: '100%', height: 40, borderRadius: 11, border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px 0 38px', fontSize: 14, color: 'var(--anrix-text-strong)', outline: 'none' }} />
            </div>

            {/* Dense list — one card, thin divided rows; tap a row → full profile */}
            {(() => {
              const visible = rows.filter(({ w }) => !paySearch || w.name.toLowerCase().includes(paySearch.toLowerCase()));
              return (
                <div className="anrix-card" style={{ padding: '0 12px' }}>
                  {visible.map(({ w, days, ot, adv, paid, net }, i) => {
                    const settled = paid > 0 && net <= 0;
                    return (
                      <div key={w.id} onClick={() => setProfileId(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none', cursor: 'pointer', opacity: settled ? 0.6 : 1 }}>
                        <Avatar name={w.name} src={w.photo} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{w.name}</div>
                          <div className="anrix-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {days}d × ₹{w.dayRate}{ot ? ` +${ot}h OT` : ''}{adv > 0 ? ` · adv −${rupee(adv)}` : ''}
                          </div>
                        </div>
                        {settled ? (
                          <Badge tone="success">{t('wf.paidCheck', 'Paid ✓')}</Badge>
                        ) : (
                          <>
                            <strong style={{ color: 'var(--anrix-success)', fontSize: 14, flexShrink: 0 }}>{rupee(net)}</strong>
                            {net > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); addPayout({ projectId: activeProjectId, workerId: w.id, amount: net, periodKey: range.key, date: TODAY_LABEL, dateKey: TODAY_KEY }); setToast(`Paid ${rupee(net)} to ${w.name} ✓`); }}
                                style={{ background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', border: 'none', borderRadius: 9, padding: '7px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {t('wf.pay', 'Pay')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {remaining <= 0 && rows.length > 0 && (
              <div style={{ textAlign: 'center', color: 'var(--anrix-success)', fontWeight: 700, fontSize: 13, marginTop: 12 }}>{t('wf.allSettledForPeriod', 'All settled for this period ✓')}</div>
            )}
          </div>
          );
        })()}

        {/* ---------- BILLS / EXPENSES ---------- */}
        {tab === 'bills' && (
          <div style={{ padding: '0 10px 24px' }}>
            {/* compact total + add on one row */}
            <div className="anrix-card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
              <div style={{ flex: 1 }}>
                <div className="anrix-muted" style={{ fontSize: 11.5 }}>{t('wf.totalBills', 'Total bills')}</div>
                <strong style={{ fontSize: 19 }}>{rupee(totals.expenseTotal)}</strong>
              </div>
              <button onClick={() => setCatSheet(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 40, padding: '0 16px', borderRadius: 999, border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', flexShrink: 0 }}>
                <IonIcon icon={addOutline} style={{ fontSize: 18 }} /> {t('wf.addBill', 'Add bill')}
              </button>
            </div>

            {/* Owed to supervisors — bills they fronted, awaiting reimbursement */}
            {supOwed.length > 0 && (
              <div className="anrix-card" style={{ marginBottom: 14, padding: 14 }}>
                <div className="anrix-muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('wf.owedToSupervisors', 'Owed to supervisors')}</div>
                {supOwed.map(({ sup, amount }) => (
                  <div key={sup.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <Avatar name={sup.name} src={sup.photo} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sup.name}</div>
                      <div className="anrix-muted" style={{ fontSize: 11.5 }}>{t('wf.paidForSitePurchases', 'paid for site purchases')}</div>
                    </div>
                    <strong style={{ color: 'var(--anrix-warning)', fontSize: 15 }}>{rupee(amount)}</strong>
                    <button onClick={() => { settleSupervisorExpenses(sup.id); setToast(`Reimbursed ${rupee(amount)} to ${sup.name} ✓`); }}
                      style={{ background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', border: 'none', borderRadius: 8, padding: '7px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('wf.settle', 'Settle')}</button>
                  </div>
                ))}
              </div>
            )}

            {/* Compact list — one card, thin divided rows. Fits many bills without endless scroll. */}
            {expenses.length > 0 && (
              <div className="anrix-card" style={{ padding: '0 12px' }}>
                {expenses.map((e, i) => {
                  const payer = e.paidBy ? supName(e.paidBy) : null;
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                      <span style={{ fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0 }}>{EXPENSE_META[e.category].emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                        <div className="anrix-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {EXPENSE_META[e.category].label} · {e.date}
                          {payer && <span style={{ color: e.settled ? 'var(--anrix-success)' : 'var(--anrix-warning)', fontWeight: 600 }}> · {e.settled ? `paid back ${payer}` : `by ${payer}`}</span>}
                        </div>
                      </div>
                      <strong style={{ fontSize: 13.5, flexShrink: 0 }}>{rupee(e.amount)}</strong>
                      <button onClick={() => removeExpense(e.id)} aria-label="Delete" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <IonIcon icon={trashOutline} style={{ color: 'var(--anrix-text-muted)', fontSize: 17 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------- FILES & LOCATION ---------- */}
        {tab === 'files' && (
          <div style={{ padding: '0 10px 24px' }}>
            {/* Location */}
            <div style={{ fontWeight: 700, fontSize: 14, margin: '2px 2px 8px' }}>{t('wf.projectLocation', 'Project location')}</div>
            <div className="anrix-card" style={{ padding: 14, marginBottom: 18 }}>
              {activeProject?.location ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <IonIcon icon={locationOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {activeProject.location.label ?? t('wf.geoTagged', 'Geo-tagged')}</div>
                      <div className="anrix-muted" style={{ fontSize: 12 }}>{activeProject.location.label ? t('wf.tapViewMapToOpen', 'Tap “View map” to open') : approxAddress(activeProject.location)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${activeProject.location.lat},${activeProject.location.lng}`} target="_blank" rel="noreferrer"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                      <IonIcon icon={mapOutline} /> {t('wf.viewOnMap', 'View on map')}
                    </a>
                    <button onClick={captureLocation} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', color: 'var(--anrix-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <IonIcon icon={navigateOutline} /> {t('wf.update', 'Update')}
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={captureLocation} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, border: '1.5px dashed var(--anrix-border)', background: 'transparent', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  <IonIcon icon={navigateOutline} /> {t('wf.tagCurrentLocationGps', 'Tag current location (GPS)')}
                </button>
              )}
            </div>

            {/* Documents & photos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 8px' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t('wf.designsDocumentsPhotos', 'Designs, documents & photos')}</span>
              <button onClick={() => fileInput.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', border: 'none', borderRadius: 999, padding: '7px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                <IonIcon icon={cloudUploadOutline} /> {t('wf.add', 'Add')}
              </button>
            </div>
            <input ref={fileInput} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg" onChange={onPickFiles} style={{ display: 'none' }} />

            {docs.length === 0 ? (
              <div className="anrix-card" style={{ textAlign: 'center', padding: 24, color: 'var(--anrix-text-muted)' }}>
                {t('wf.noFilesYet', 'No files yet. Add site designs, drawings, permits or progress photos.')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {docs.map((doc) => (
                  <div key={doc.id} className="anrix-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, display: 'flex', gap: 6 }}>
                      <button onClick={() => downloadDoc(doc)} aria-label="Download"
                        style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                        <IonIcon icon={downloadOutline} style={{ fontSize: 14 }} />
                      </button>
                      <button onClick={() => removeProjectDoc(activeProjectId, doc.id)} aria-label="Remove"
                        style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                        <IonIcon icon={closeOutline} style={{ fontSize: 15 }} />
                      </button>
                    </div>
                    {doc.kind === 'image' && doc.dataUrl ? (
                      <img src={doc.dataUrl} alt={doc.name} style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: 96, display: 'grid', placeItems: 'center', background: 'var(--anrix-surface-2)' }}>
                        <IonIcon icon={doc.kind === 'image' ? imageOutline : documentOutline} style={{ fontSize: 34, color: 'var(--anrix-text-muted)' }} />
                      </div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div className="anrix-muted" style={{ fontSize: 10.5 }}>{doc.addedAt}{doc.size ? ` · ${Math.max(1, Math.round(doc.size / 1024))} KB` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </AnimatedPage>

      {/* ---- Floating tools — one button that expands (so it never covers content) ---- */}
      {toolsOpen && <div onClick={() => setToolsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
      <div style={{ position: 'fixed', right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {toolsOpen && (
          <>
            <button onClick={() => { setNotesOpen(true); setToolsOpen(false); }} style={toolPill}>
              {t('wf.notes', 'Notes')}
              <span style={toolPillIcon('var(--anrix-surface-2)')}><IonIcon icon={documentTextOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /></span>
            </button>
            <button onClick={() => { setCalcOpen(true); setToolsOpen(false); }} style={toolPill}>
              {t('wf.calculator', 'Calculator')}
              <span style={toolPillIcon('var(--anrix-surface-2)')}><IonIcon icon={calculatorOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /></span>
            </button>
          </>
        )}
        <button onClick={() => setToolsOpen((o) => !o)} aria-label="Tools" style={fab('var(--anrix-primary)')}>
          <IonIcon icon={toolsOpen ? closeOutline : calculatorOutline} style={{ fontSize: 25, color: '#fff' }} />
          {!toolsOpen && (activeProject?.notes?.trim()?.length ?? 0) > 0 && <span style={fabDot} />}
        </button>
      </div>

      {/* ---- Calculator ---- */}
      <IonModal isOpen={calcOpen} onDidDismiss={() => setCalcOpen(false)} initialBreakpoint={0.78} breakpoints={[0, 0.78, 1]}>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('wf.calculator', 'Calculator')}</h2>
            <button onClick={() => setCalcOpen(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>
          <Calculator />
        </div>
      </IonModal>

      {/* ---- Notes ---- */}
      <IonModal isOpen={notesOpen} onDidDismiss={() => setNotesOpen(false)} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('wf.notes', 'Notes')} · {activeProject?.name}</h2>
            <button onClick={() => setNotesOpen(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>
          <div className="anrix-muted" style={{ fontSize: 11.5, marginBottom: 10 }}>{t('wf.savedAutomatically', 'Saved automatically · work assignments, reminders, site notes')}</div>
          <textarea
            autoFocus
            value={activeProject?.notes ?? ''}
            onChange={(e) => setProjectNotes(activeProjectId, e.target.value)}
            placeholder={'Write site notes here…\n\ne.g.\n• Ravi + Suresh → 2nd floor slab\n• Imran → wiring, block A\n• Order 50 cement bags Monday'}
            style={{ flex: 1, width: '100%', borderRadius: 14, border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: 14, fontSize: 15, lineHeight: 1.55, color: 'var(--anrix-text-strong)', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      </IonModal>

      {/* ---- Add Supervisor — custom sheet so the Site/location field can carry a GPS pin ---- */}
      <IonModal isOpen={supAlert} onDidDismiss={() => { setSupAlert(false); setSupEditId(null); }} initialBreakpoint={0.62} breakpoints={[0, 0.62, 0.95]}>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{supEditId ? t('wf.editSupervisor', 'Edit Supervisor') : t('wf.addSupervisor', 'Add Supervisor')}</h2>
            <button onClick={() => setSupAlert(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>

          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 6 }}>
            <PhotoCircle value={supForm.photo} onPick={(d) => setSupForm((f) => ({ ...f, photo: d }))} />
          </div>

          <label style={supLabel}>{t('wf.name', 'Name')}</label>
          <input value={supForm.name} autoFocus onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('wf.supervisorName', 'Supervisor name')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.phone', 'Phone')}</label>
          <input value={supForm.phone} inputMode="tel" onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('wf.phone', 'Phone')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.dayRateRupee', 'Day rate ₹')}</label>
          <input value={supForm.dayRate} inputMode="numeric" onChange={(e) => setSupForm((f) => ({ ...f, dayRate: e.target.value.replace(/\D/g, '') }))} placeholder={t('wf.dayRateRupee', 'Day rate ₹')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.siteLocation', 'Site / location')}</label>
          <LocationField value={supForm.site} onChange={(v) => setSupForm((f) => ({ ...f, site: v }))} placeholder={t('wf.siteAddressArea', 'Site address / area')} />

          <button
            onClick={() => { if (supForm.name.trim()) { const body = { name: supForm.name.trim(), phone: supForm.phone.trim(), site: supForm.site.trim(), dayRate: Number(supForm.dayRate) || undefined, photo: supForm.photo || undefined }; if (supEditId) { updateSupervisor(supEditId, body); } else { addSupervisor({ projectId: activeProjectId, ...body }); } setSupAlert(false); setSupEditId(null); } }}
            disabled={!supForm.name.trim()} className="anrix-pressable"
            style={{ marginTop: 22, width: '100%', height: 50, borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', opacity: supForm.name.trim() ? 1 : 0.5 }}>
            {supEditId ? t('wf.saveSupervisor', 'Save Supervisor') : t('wf.addSupervisor', 'Add Supervisor')}
          </button>
        </div>
      </IonModal>

      {/* ---- Add Worker (under a supervisor, or direct when supervisorId is '') ----
           Controlled IonModal (not IonAlert) so the form always opens blank and can
           carry a photo + phone — the phone is the worker's identity for payments. */}
      <IonModal isOpen={!!workerDialog} onDidDismiss={() => setWorkerDialog(null)} initialBreakpoint={0.78} breakpoints={[0, 0.78, 0.98]}>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('wf.addWorker', 'Add Worker')}</h2>
            <button onClick={() => setWorkerDialog(null)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>
          <div className="anrix-muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
            {workerDialog?.supervisorId ? `Under ${supName(workerDialog.supervisorId)}` : t('wf.noSupervisorDirectWorker', 'No supervisor — direct worker')}
          </div>

          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 6 }}>
            <PhotoCircle value={workerForm.photo} onPick={(d) => setWorkerForm((f) => ({ ...f, photo: d }))} />
          </div>

          <label style={supLabel}>{t('wf.name', 'Name')}</label>
          <input value={workerForm.name} autoFocus onChange={(e) => setWorkerForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('wf.workerName', 'Worker name')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.trade', 'Trade')}</label>
          <input value={workerForm.trade} onChange={(e) => setWorkerForm((f) => ({ ...f, trade: e.target.value }))} placeholder={t('wf.tradeEgMason', 'Trade (e.g. Mason)')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.phone', 'Phone')}</label>
          <input value={workerForm.phone} inputMode="tel" onChange={(e) => setWorkerForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('wf.phone', 'Phone')} style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.dayRateRupee', 'Day rate ₹')}</label>
          <input value={workerForm.rate} inputMode="numeric" onChange={(e) => setWorkerForm((f) => ({ ...f, rate: e.target.value.replace(/\D/g, '') }))} placeholder={t('wf.dayRateRupee', 'Day rate ₹')} style={supInput} />

          <button
            onClick={() => { if (workerForm.name.trim() && workerDialog) { addWorker({ projectId: activeProjectId, name: workerForm.name.trim(), trade: workerForm.trade.trim() || 'Worker', emoji: '👷', supervisorId: workerDialog.supervisorId, dayRate: Number(workerForm.rate) || 600, mobile: workerForm.phone.trim() || undefined, photo: workerForm.photo || undefined }); setWorkerDialog(null); } }}
            disabled={!workerForm.name.trim()} className="anrix-pressable"
            style={{ marginTop: 22, width: '100%', height: 50, borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', opacity: workerForm.name.trim() ? 1 : 0.5 }}>
            {t('wf.addWorker', 'Add Worker')}
          </button>
        </div>
      </IonModal>

      {/* ---- Add / edit a flat (unit inventory + sale + documents) ---- */}
      <IonModal isOpen={!!unitEdit} onDidDismiss={() => setUnitEdit(null)} initialBreakpoint={0.92} breakpoints={[0, 0.92, 1]}>
        <div style={{ padding: 18, maxHeight: '92vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{unitEdit === 'new' ? t('wf.addFlat', 'Add flat / unit') : t('wf.editFlat', 'Edit flat')}</h2>
            <button onClick={() => setUnitEdit(null)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={supLabel}>{t('wf.floor', 'Floor')}</label>
              <input value={unitForm.floor} inputMode="numeric" onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value.replace(/\D/g, '') }))} placeholder="3" style={supInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={supLabel}>{t('wf.flatNo', 'Flat no')}</label>
              <input value={unitForm.number} onChange={(e) => setUnitForm((f) => ({ ...f, number: e.target.value }))} placeholder="301" style={supInput} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={supLabel}>{t('wf.type', 'Type')}</label>
              <input value={unitForm.unitType} onChange={(e) => setUnitForm((f) => ({ ...f, unitType: e.target.value }))} placeholder="2BHK" style={supInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={supLabel}>{t('wf.areaSqft', 'Area (sqft)')}</label>
              <input value={unitForm.areaSqft} inputMode="numeric" onChange={(e) => setUnitForm((f) => ({ ...f, areaSqft: e.target.value.replace(/\D/g, '') }))} placeholder="1150" style={supInput} />
            </div>
          </div>

          <label style={{ ...supLabel, marginTop: 12 }}>{t('wf.price', 'Price ₹')}</label>
          <input value={unitForm.price} inputMode="numeric" onChange={(e) => setUnitForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, '') }))} placeholder="4500000" style={supInput} />

          <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.status', 'Status')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {UNIT_STATUSES.map((s) => (
              <button key={s} onClick={() => setUnitForm((f) => ({ ...f, status: s }))} style={{
                padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: unitForm.status === s ? '1.5px solid transparent' : '1px solid var(--anrix-border)',
                background: unitForm.status === s ? unitTone(s).bg : 'var(--anrix-surface)',
                color: unitForm.status === s ? unitTone(s).fg : 'var(--anrix-text-muted)',
              }}>{t(`wf.unit_${s}`, s)}</button>
            ))}
          </div>

          {/* Buyer + payment — shown once it's beyond 'available' */}
          {unitForm.status !== 'available' && (
            <>
              <label style={{ ...supLabel, marginTop: 14 }}>{t('wf.buyerName', 'Buyer name')}</label>
              <input value={unitForm.buyerName} onChange={(e) => setUnitForm((f) => ({ ...f, buyerName: e.target.value }))} placeholder={t('wf.buyerName', 'Buyer name')} style={supInput} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={supLabel}>{t('wf.phone', 'Phone')}</label>
                  <input value={unitForm.buyerPhone} inputMode="tel" onChange={(e) => setUnitForm((f) => ({ ...f, buyerPhone: e.target.value }))} placeholder={t('wf.phone', 'Phone')} style={supInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={supLabel}>{t('wf.received', 'Received ₹')}</label>
                  <input value={unitForm.amountReceived} inputMode="numeric" onChange={(e) => setUnitForm((f) => ({ ...f, amountReceived: e.target.value.replace(/\D/g, '') }))} placeholder="0" style={supInput} />
                </div>
              </div>
            </>
          )}

          {/* Documents — only for a saved unit (stored on the shared backend) */}
          {unitEdit && unitEdit !== 'new' && (
            <>
              <label style={{ ...supLabel, marginTop: 16 }}>{t('wf.documents', 'Documents')} <span className="anrix-muted" style={{ fontWeight: 500 }}>· {t('wf.docsHint', 'allotment, agreement, sale deed, registration')}</span></label>
              <input ref={unitFileInput} type="file" accept="image/*,application/pdf" onChange={onPickUnitDoc} style={{ display: 'none' }} />
              <button onClick={() => unitFileInput.current?.click()} disabled={addUnitDocMut.isPending} style={{ ...addRowBtn, marginTop: 0 }}><IonIcon icon={cloudUploadOutline} /> {addUnitDocMut.isPending ? t('wf.uploading', 'Uploading…') : t('wf.uploadDocument', 'Upload document')}</button>
              {(unitDocsQ.data ?? []).map((doc: any) => (
                <div key={doc.doc_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--anrix-border)' }}>
                  <IonIcon icon={documentOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={doc.url_tx} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--anrix-text-strong)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{doc.nm_tx}</a>
                    <div className="anrix-muted" style={{ fontSize: 11 }}>{doc.kind_cd || t('wf.document', 'document')}</div>
                  </div>
                  <button onClick={() => removeUnitDocMut.mutate(doc.doc_id)} style={iconBtn}><IonIcon icon={trashOutline} style={{ color: 'var(--anrix-danger)' }} /></button>
                </div>
              ))}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {unitEdit && unitEdit !== 'new' && (
              <GradientButton variant="outline" icon={trashOutline} onClick={() => removeUnitMut.mutate(unitEdit)} style={{ flex: 1 }}>{t('wf.remove', 'Remove')}</GradientButton>
            )}
            <GradientButton full icon={addOutline} onClick={saveUnit} style={{ flex: 2 }}>{unitEdit === 'new' ? t('wf.addFlat', 'Add flat') : t('wf.save', 'Save')}</GradientButton>
          </div>
        </div>
      </IonModal>

      {/* ---- Shift a worker to another site (multi-site) ---- */}
      <IonActionSheet
        isOpen={!!moveWorkerId}
        header={t('wf.shiftToSite', 'Shift to another site')}
        onDidDismiss={() => setMoveWorkerId(null)}
        buttons={[
          ...projects.filter((p) => p.id !== activeProjectId).map((p) => ({
            text: `🏗️  ${p.name}`,
            handler: () => { if (moveWorkerId) { moveWorker(moveWorkerId, p.id); setToast(`Shifted to ${p.name}`); setProfileId(null); } },
          })),
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />

      {/* ---- Link a worker from another project · pick the person ---- */}
      <IonActionSheet
        isOpen={linkSheet}
        header={t('wf.addWorkerFromAnotherProject', 'Add worker from another project')}
        onDidDismiss={() => setLinkSheet(false)}
        buttons={[
          ...peopleElsewhere.map((p) => ({
            text: `${p.emoji}  ${p.name} · ${p.trade} (${projectName(p.projectId)})`,
            handler: () => setLinkPerson(p),
          })),
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />

      {/* ---- Link a worker · confirm day rate for this project ---- */}
      <IonAlert
        isOpen={!!linkPerson}
        header={linkPerson ? `Add ${linkPerson.name} here` : ''}
        message={linkPerson ? `${linkPerson.name} also works on ${projectName(linkPerson.projectId)}. Set their day rate for ${activeProject?.name}.` : ''}
        onDidDismiss={() => setLinkPerson(null)}
        inputs={[{ name: 'rate', type: 'number', placeholder: t('wf.dayRateRupee', 'Day rate ₹'), value: linkPerson ? String(linkPerson.dayRate) : '' }]}
        buttons={[
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' },
          { text: t('wf.add', 'Add'), handler: (d) => { if (linkPerson) { addWorker({ projectId: activeProjectId, personId: linkPerson.personId, name: linkPerson.name, trade: linkPerson.trade, emoji: linkPerson.emoji, supervisorId: '', dayRate: Number(d.rate) || linkPerson.dayRate }); setToast(`${linkPerson.name} added to ${activeProject?.name}`); } } },
        ]}
      />

      {/* ---- Add bill · step 1: category ---- */}
      <IonActionSheet
        isOpen={catSheet}
        header={t('wf.billCategory', 'Bill category')}
        onDidDismiss={() => setCatSheet(false)}
        buttons={[
          ...(Object.keys(EXPENSE_META) as ExpenseCategory[]).map((c) => ({
            text: `${EXPENSE_META[c].emoji}  ${EXPENSE_META[c].label}`,
            handler: () => { setPendingCat(c); setPayerSheet(true); },
          })),
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />

      {/* ---- Add bill · step 2: who paid? ---- */}
      <IonActionSheet
        isOpen={payerSheet}
        header={t('wf.whoPaidForThis', 'Who paid for this?')}
        onDidDismiss={() => setPayerSheet(false)}
        buttons={[
          { text: t('wf.companyBuilder', '🏢  Company / Builder'), handler: () => { setExpensePaidBy(''); setExpenseCat(pendingCat); } },
          ...supervisors.map((s) => ({
            text: `👷  ${s.name} (reimburse)`,
            handler: () => { setExpensePaidBy(s.id); setExpenseCat(pendingCat); },
          })),
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />

      {/* ---- Add bill · step 3: details ---- */}
      <IonAlert
        isOpen={!!expenseCat}
        header={`Add ${expenseCat ? EXPENSE_META[expenseCat].label : ''} bill`}
        message={expensePaidBy ? `Paid by ${supName(expensePaidBy)} — will be reimbursed` : t('wf.paidByCompany', 'Paid by company')}
        onDidDismiss={() => setExpenseCat(null)}
        inputs={[
          { name: 'title', placeholder: t('wf.whatForEgCement', 'What for? (e.g. Cement 100 bags)') },
          { name: 'amount', type: 'number', placeholder: t('wf.amountRupee', 'Amount ₹') },
        ]}
        buttons={[
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' },
          { text: t('wf.add', 'Add'), handler: (d) => { if (d.title && expenseCat) addExpense({ projectId: activeProjectId, category: expenseCat, title: d.title, amount: Number(d.amount) || 0, date: TODAY_LABEL, paidBy: expensePaidBy || undefined }); } },
        ]}
      />

      {/* ---- Overtime hours ---- */}
      <IonAlert
        isOpen={!!otWorker}
        header={t('wf.overtimeExtraWork', 'Overtime (extra work)')}
        message={otWorker ? `${workers.find((w) => w.id === otWorker)?.name} · today · paid at 1.5× hourly` : ''}
        onDidDismiss={() => setOtWorker(null)}
        inputs={[{ name: 'hours', type: 'number', placeholder: t('wf.extraHoursEg2', 'Extra hours (e.g. 2)'), value: otWorker ? String(todayOt[otWorker] ?? '') : '' }]}
        buttons={[
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' },
          { text: t('wf.clear', 'Clear'), handler: () => { if (otWorker) setOvertime(TODAY_KEY, otWorker, 0); } },
          { text: t('wf.save', 'Save'), handler: (d) => { if (otWorker) setOvertime(TODAY_KEY, otWorker, Math.max(0, Number(d.hours) || 0)); } },
        ]}
      />

      {/* ---- Give advance / deduct from period ---- */}
      <IonAlert
        isOpen={!!advWorker}
        header={t('wf.advanceDeduction', 'Advance / deduction')}
        message={advWorker ? `${workers.find((w) => w.id === advWorker)?.name} · given now, deducted from ${range.label} wages` : ''}
        onDidDismiss={() => setAdvWorker(null)}
        inputs={[
          { name: 'amount', type: 'number', placeholder: t('wf.amountToDeductEg3000', 'Amount to deduct ₹ (e.g. 3000)') },
          { name: 'note', placeholder: t('wf.noteOptional', 'Note (optional)') },
        ]}
        buttons={[
          { text: t('wf.cancel', 'Cancel'), role: 'cancel' },
          { text: t('wf.deduct', 'Deduct'), handler: (d) => { if (advWorker && Number(d.amount) > 0) { addAdvance({ workerId: advWorker, amount: Number(d.amount), date: TODAY_LABEL, dateKey: TODAY_KEY, note: d.note || undefined }); setToast(`₹${Number(d.amount).toLocaleString('en-IN')} deducted from ${range.label}`); } } },
        ]}
      />

      {/* ---- Worker profile ---- */}
      <IonModal isOpen={!!profileId} onDidDismiss={() => setProfileId(null)} initialBreakpoint={0.92} breakpoints={[0, 0.92, 1]}>
        {(() => {
          const w = workers.find((x) => x.id === profileId);
          if (!w) return null;
          const d = daysWorked(w.id);
          return (
            <div style={{ padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setProfileId(null)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -8 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar name={w.name} src={w.photo} size={84} />
                  <span style={{ position: 'absolute', bottom: -2, right: -4, fontSize: 24 }}>{w.emoji}</span>
                </div>
                <h2 style={{ margin: '12px 0 2px', fontSize: 22, fontWeight: 800 }}>{w.name}</h2>
                <div className="anrix-muted">{w.trade} · ₹{w.dayRate}/day</div>
                <div style={{ marginTop: 8 }}>{w.supervisorId ? <Badge tone="primary">{t('wf.under', 'Under')} {supName(w.supervisorId)}</Badge> : <Badge tone="info">{t('wf.noSupervisor', 'No supervisor')}</Badge>}</div>
              </div>

              {/* Editable photo & phone — phone is the worker's identity for payments */}
              <div className="anrix-card" style={{ marginTop: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                <PhotoCircle value={w.photo} size={60} onPick={(dataUrl) => updateWorker(w.id, { photo: dataUrl })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={supLabel}>{t('wf.phone', 'Phone')}</label>
                  <input value={w.mobile ?? ''} inputMode="tel" placeholder={t('wf.phone', 'Phone')}
                    onChange={(e) => updateWorker(w.id, { mobile: e.target.value })} style={supInput} />
                </div>
                {w.mobile ? (
                  <a href={`tel:${w.mobile}`} aria-label="Call" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', color: 'var(--anrix-primary-strong)' }}>
                    <IonIcon icon={callOutline} style={{ fontSize: 20 }} />
                  </a>
                ) : null}
              </div>

              {/* stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
                <StatCard icon="📅" label={t('wf.daysWorked', 'Days worked')} value={d} tone="blue" />
                <StatCard icon="⏱️" label={t('wf.otHours', 'OT hours')} value={otHours(w.id)} tone="amber" />
                <StatCard icon="💰" label={t('wf.netPayable', 'Net payable')} value={rupee(netOf(w))} tone="green" />
              </div>

              <div className="anrix-card" style={{ marginTop: 14 }}>
                <Row label={t('wf.grossWages', 'Gross wages')} value={rupee(grossOf(w))} />
                <Row label={t('wf.overtimePay15x', 'Overtime pay (1.5×)')} value={rupee(otPay(w.id, w.dayRate))} />
                <Row label={t('wf.advancesTaken', 'Advances taken')} value={`−${rupee(advanceOf(w.id))}`} warn />
                <div style={{ borderTop: '1px dashed var(--anrix-border)', marginTop: 8, paddingTop: 8 }}>
                  <Row label={t('wf.netPayable', 'Net payable')} value={rupee(netOf(w))} bold />
                </div>
              </div>

              {/* across projects — same person on multiple sites */}
              {(() => {
                const records = allWorkers.filter((x) => x.personId === w.personId);
                if (records.length < 2) return null;
                const totalDays = records.reduce((s, r) => s + daysWorked(r.id), 0);
                const totalGross = records.reduce((s, r) => s + grossOf(r), 0);
                return (
                  <>
                    <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{t('wf.worksAcrossNProjects', 'Works across {{n}} projects', { n: records.length })}</div>
                    <div className="anrix-card" style={{ padding: '4px 12px' }}>
                      {records.map((r, i) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                          <span style={{ fontSize: 16 }}>🏗️</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {projectName(r.projectId)}{r.projectId === w.projectId ? ' · here' : ''}
                            </div>
                            <div className="anrix-muted" style={{ fontSize: 11.5 }}>{daysWorked(r.id)} days × ₹{r.dayRate}</div>
                          </div>
                          <strong style={{ fontSize: 13.5 }}>{rupee(grossOf(r))}</strong>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px dashed var(--anrix-border)', marginTop: 2 }}>
                        <strong style={{ fontSize: 13.5 }}>{t('wf.total', 'Total')} · {totalDays} {t('wf.daysLower', 'days')}</strong>
                        <strong style={{ fontSize: 14, color: 'var(--anrix-success)' }}>{rupee(totalGross)}</strong>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* recent advances */}
              {advances.filter((a) => a.workerId === w.id).length > 0 && (
                <>
                  <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{t('wf.advanceHistory', 'Advance history')}</div>
                  {advances.filter((a) => a.workerId === w.id).map((a) => (
                    <div key={a.id} className="anrix-card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                      <IonIcon icon={walletOutline} style={{ color: 'var(--anrix-warning)', fontSize: 20 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{rupee(a.amount)}</div>
                        <div className="anrix-muted" style={{ fontSize: 12 }}>{a.date}{a.note ? ` · ${a.note}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* payment history */}
              {payouts.filter((p) => p.workerId === w.id).length > 0 && (
                <>
                  <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{t('wf.paymentHistory', 'Payment history')}</div>
                  {payouts.filter((p) => p.workerId === w.id).map((p) => (
                    <div key={p.id} className="anrix-card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                      <IonIcon icon={cashOutline} style={{ color: 'var(--anrix-success)', fontSize: 20 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{rupee(p.amount)} {t('wf.paidLower', 'paid')}</div>
                        <div className="anrix-muted" style={{ fontSize: 12 }}>{p.date} · {p.periodKey.startsWith('week') ? 'weekly' : p.periodKey.startsWith('month') ? 'monthly' : 'wages'}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {projects.length > 1 && (
                <GradientButton variant="outline" full icon={navigateOutline} onClick={() => setMoveWorkerId(w.id)} style={{ marginTop: 10 }}>{t('wf.shiftToAnotherSite', 'Shift to another site')}</GradientButton>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <GradientButton variant="outline" full icon={trashOutline} onClick={() => { removeWorker(w.id); setProfileId(null); }} style={{ flex: 1 }}>{t('wf.remove', 'Remove')}</GradientButton>
                <GradientButton full icon={walletOutline} onClick={() => { setProfileId(null); setAdvWorker(w.id); }} style={{ flex: 2 }}>{t('wf.giveAdvance', 'Give advance')}</GradientButton>
              </div>
            </div>
          );
        })()}
      </IonModal>

      <IonToast isOpen={!!toast} message={toast} duration={1400} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

function colorFor(tone: 'success' | 'danger' | 'warning' | 'info') {
  return tone === 'success' ? 'var(--anrix-success)' : tone === 'danger' ? 'var(--anrix-danger)' : tone === 'info' ? 'var(--anrix-info)' : 'var(--anrix-warning)';
}
function Row({ label, value, warn, bold }: { label: string; value: string; warn?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span className={bold ? undefined : 'anrix-muted'} style={{ fontSize: 14, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <strong style={{ fontSize: bold ? 17 : 14, color: warn ? 'var(--anrix-warning)' : bold ? 'var(--anrix-success)' : 'var(--anrix-text-strong)' }}>{value}</strong>
    </div>
  );
}
const pill = (active: boolean): React.CSSProperties => ({
  whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
  border: active ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
  background: active ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
});
/** Floating action button (WhatsApp-style) for the on-screen tools. */
const fab = (bg: string): React.CSSProperties => ({
  position: 'relative', width: 52, height: 52, borderRadius: '50%', border: bg === 'var(--anrix-surface)' ? '1px solid var(--anrix-border)' : 'none',
  background: bg, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 6px 18px rgba(22,24,29,0.22)',
});
const fabDot: React.CSSProperties = { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: '50%', background: 'var(--anrix-primary)', border: '2px solid var(--anrix-surface)' };
const toolPill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 6px 0 16px', borderRadius: 999,
  border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 6px 18px rgba(22,24,29,0.18)',
};
const toolPillIcon = (bg: string): React.CSSProperties => ({ width: 32, height: 32, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', flexShrink: 0 });
/** Smaller pill for the payroll pay-period filter — saves vertical space. */
const periodPill = (active: boolean): React.CSSProperties => ({
  flex: 1, whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
  border: active ? '1.5px solid transparent' : '1px solid var(--anrix-border)',
  background: active ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
});
const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 };
const addRowBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1.5px dashed var(--anrix-border)', background: 'transparent', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const supLabel: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', marginBottom: 7, letterSpacing: 0.2 };
const supInput: React.CSSProperties = { width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontSize: 15, outline: 'none', boxSizing: 'border-box' };

/** Allowed radius (metres) around the site within which attendance can be marked.
 *  Construction sites are large + GPS drifts ~10-20m, so we allow a small buffer. */
const GEOFENCE_M = 50;

/** Field-accurate document checklist for an Indian residential builder, grouped by
 *  project stage (from deep-research: RERA §13 sales chain, OC/CC, NOCs, land records). */
const DOC_STAGES: { key: string; label: string; items: { kind: string; label: string }[] }[] = [
  { key: 'approvals', label: 'Approvals & permissions', items: [
    { kind: 'title', label: 'Title deed / land ownership' },
    { kind: 'ec', label: 'Encumbrance certificate' },
    { kind: 'land-records', label: '7/12 · land records · mutation' },
    { kind: 'na-conversion', label: 'Land-use conversion (NA order)' },
    { kind: 'plan-sanction', label: 'Building plan / layout sanction' },
    { kind: 'commencement', label: 'Commencement certificate' },
    { kind: 'rera', label: 'RERA registration' },
    { kind: 'env-clearance', label: 'Environmental clearance' },
    { kind: 'noc-fire', label: 'Fire NOC' },
    { kind: 'noc-water', label: 'Water NOC' },
    { kind: 'noc-electricity', label: 'Electricity NOC' },
    { kind: 'noc-airport', label: 'Airport (AAI) height NOC' },
    { kind: 'noc-pollution', label: 'Pollution control NOC' },
  ] },
  { key: 'construction', label: 'Construction', items: [
    { kind: 'structural', label: 'Structural / GFC drawings' },
    { kind: 'soil-test', label: 'Soil test report' },
    { kind: 'plinth', label: 'Plinth verification' },
    { kind: 'insurance', label: 'CAR insurance policy' },
    { kind: 'bocw', label: 'BOCW / labour licence' },
  ] },
  { key: 'completion', label: 'Completion & handover', items: [
    { kind: 'oc', label: 'Occupancy Certificate (OC)' },
    { kind: 'cc-final', label: 'Completion Certificate' },
    { kind: 'fire-final', label: 'Final fire safety certificate' },
    { kind: 'property-tax', label: 'Property tax / khata' },
    { kind: 'snag', label: 'Snag list / handover checklist' },
  ] },
  { key: 'sales', label: 'Sales collateral', items: [
    { kind: 'price-list', label: 'Price list / cost sheet' },
    { kind: 'agreement-template', label: 'Sample Agreement for Sale' },
    { kind: 'allotment-template', label: 'Allotment letter template' },
    { kind: 'brochure', label: 'Brochure / floor plans' },
    { kind: 'rera-progress', label: 'RERA quarterly progress report' },
  ] },
];

/** Colour tokens per flat status — chip + tile background. */
function unitTone(s: UnitStatus): { bg: string; fg: string; badge: 'success' | 'danger' | 'warning' | 'info' | 'primary' } {
  switch (s) {
    case 'blocked': return { bg: '#fff3cd', fg: '#8a6d00', badge: 'warning' };
    case 'booked': return { bg: 'var(--anrix-primary-soft)', fg: 'var(--anrix-primary-strong)', badge: 'primary' };
    case 'sold': return { bg: '#e3f5ee', fg: '#17936b', badge: 'success' };
    case 'registered': return { bg: '#dbeafe', fg: '#1e40af', badge: 'info' };
    default: return { bg: 'var(--anrix-surface-2)', fg: 'var(--anrix-text-muted)', badge: 'info' };
  }
}

/** Great-circle distance in metres between two lat/lng points (haversine). */
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Short local time like "9:12 AM" for an epoch-ms stamp. */
function fmtTime(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Circular photo picker used across every role form (supervisor, worker, …).
 *  Reads the chosen image as a data URL and hands it back via onPick. */
function PhotoCircle({ value, onPick, size = 76 }: { value?: string; onPick: (dataUrl: string) => void; size?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-picking the same file
  };
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 6 }}>
      <button type="button" onClick={() => inputRef.current?.click()}
        style={{ width: size, height: size, borderRadius: '50%', border: value ? '2px solid var(--anrix-primary)' : '2px dashed var(--anrix-border-strong)',
          background: value ? `center/cover no-repeat url(${value})` : 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', padding: 0 }}>
        {!value && <IonIcon icon={cameraOutline} style={{ fontSize: 26, color: 'var(--anrix-text-muted)' }} />}
      </button>
      <span style={{ fontSize: 11.5, color: 'var(--anrix-primary-strong)', fontWeight: 700 }}>{value ? 'Change photo' : 'Add photo'}</span>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
    </div>
  );
}
