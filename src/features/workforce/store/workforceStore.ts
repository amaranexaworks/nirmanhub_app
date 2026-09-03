import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { outbox, runSync, localForServer } from '@services/sync';

export type AttendanceMark = 'P' | 'A' | 'H' | 'L' | 'WO'; // Present / Absent / Half-day / Leave / Week-off (holiday)

/** When & where an attendance mark was made — the GPS proof that stops off-site marking. */
export interface AttendanceStamp {
  at: number;          // epoch ms the mark was made
  lat?: number;        // marker's latitude at that moment
  lng?: number;        // marker's longitude at that moment
  dist?: number;       // metres from the saved site location (0 when it set the anchor)
}
export type ExpenseCategory = 'material' | 'labour' | 'equipment' | 'transport' | 'misc';

/** A geo-tagged site location. */
export interface ProjectLocation {
  lat: number;
  lng: number;
  label?: string;
}
/** A saved project file — design, drawing, document or site photo. */
export interface ProjectDoc {
  id: string;
  name: string;
  kind: 'image' | 'file';
  /** data URL preview (images only). Production should store a CDN/storage URL. */
  dataUrl?: string;
  size?: number;
  addedAt: string;
}
/** A project / site. Everything (supervisors, workers, bills, files) is scoped to one. */
export interface Project {
  id: string;
  name: string;
  location?: ProjectLocation;
  /** Cover photo of the site (data URL). Shown as the project's tile in lists. */
  photo?: string;
  documents?: ProjectDoc[];
  /** Free-text notepad — work assignments, reminders, site notes. */
  notes?: string;
}
export interface Supervisor {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  site: string;
  /** Day rate for the supervisor's own wage (₹/day). */
  dayRate?: number;
  /** Profile photo (data URL). */
  photo?: string;
}
export interface ManagedWorker {
  id: string;
  projectId: string;
  /** Shared identity — the same person can have a record in several projects, all sharing one personId. */
  personId: string;
  name: string;
  trade: string;
  emoji: string;
  supervisorId: string;
  dayRate: number;
  // ---- Worker Master (all optional; filled in the worker's profile) ----
  photo?: string;            // data URL
  mobile?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  /** Skill grade — drives default rate bands in real deployments. */
  skill?: 'unskilled' | 'semi-skilled' | 'skilled' | 'highly-skilled';
  joinedOn?: string;
  // KYC / identity (record-keeping only)
  aadhaar?: string;
  pan?: string;
  // Bank / payout details
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  // Emergency contact
  emergencyName?: string;
  emergencyPhone?: string;
}
export interface Expense {
  id: string;
  projectId: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  /** Supervisor who paid out of pocket (owed reimbursement). Undefined = company paid. */
  paidBy?: string;
  /** True once the supervisor has been reimbursed. */
  settled?: boolean;
  /** Photo of the physical bill / receipt (data URL). */
  receipt?: string;
}
export interface Advance {
  id: string;
  workerId: string;
  amount: number;
  date: string;
  /** ISO yyyy-mm-dd, used to attribute the advance to a pay period. */
  dateKey?: string;
  note?: string;
}
/** A recorded wage payment to a worker for a given pay period. */
export interface Payout {
  id: string;
  projectId: string;
  workerId: string;
  amount: number;
  /** Identifies the settled period instance, e.g. "week-2026-06-22" or "month-2026-6". */
  periodKey: string;
  date: string;
  dateKey: string;
}

/** Sale/handover lifecycle status of a single flat/unit. */
export type UnitStatus = 'available' | 'blocked' | 'booked' | 'sold' | 'registered';
export const UNIT_STATUSES: UnitStatus[] = ['available', 'blocked', 'booked', 'sold', 'registered'];

/** A document attached to a flat (agreement for sale, sale deed, registration receipt…). */
export interface UnitDoc {
  id: string;
  name: string;
  dataUrl: string;
  kind?: string;      // e.g. 'allotment' | 'agreement' | 'sale-deed' | 'registration' | 'possession' | 'other'
  addedAt: string;
}

/** A sellable flat/unit in a project (floor × flat), with its sales + registration state. */
export interface Unit {
  id: string;
  projectId: string;
  floor: number;
  number: string;       // flat no, e.g. "301"
  unitType?: string;    // 1BHK / 2BHK / 3BHK / shop…
  areaSqft?: number;
  price?: number;       // asking / agreed price
  status: UnitStatus;
  // Buyer + sale (filled as it progresses)
  buyerName?: string;
  buyerPhone?: string;
  amountReceived?: number;
  bookedOn?: string;
  soldOn?: string;
  registeredOn?: string;
  documents?: UnitDoc[];
  notes?: string;
}

interface WorkforceState {
  projects: Project[];
  activeProjectId: string;
  supervisors: Supervisor[];
  workers: ManagedWorker[];
  /** attendance[date][workerId] = mark */
  attendance: Record<string, Record<string, AttendanceMark>>;
  /** attendanceMeta[date][workerId] = when + where it was marked (geo-tagged, anti-cheat) */
  attendanceMeta: Record<string, Record<string, AttendanceStamp>>;
  /** overtime[date][workerId] = extra hours */
  overtime: Record<string, Record<string, number>>;
  expenses: Expense[];
  advances: Advance[];
  payouts: Payout[];
  /** Flats/units across all projects (inventory + sales). */
  units: Unit[];

  addProject: (name: string, photo?: string) => void;
  /** Set / replace a project's cover photo (data URL). */
  setProjectPhoto: (projectId: string, photo: string) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  /** Upsert a project with an explicit id (used to mirror a backend project into the
   *  board by its real prjct_id) and make it active. Keeps any existing local extras. */
  ensureProject: (id: string, name: string) => void;
  setProjectLocation: (projectId: string, location: ProjectLocation) => void;
  setProjectNotes: (projectId: string, notes: string) => void;
  addProjectDoc: (projectId: string, doc: Omit<ProjectDoc, 'id'>) => void;
  removeProjectDoc: (projectId: string, docId: string) => void;
  addSupervisor: (s: Omit<Supervisor, 'id'>) => void;
  updateSupervisor: (id: string, patch: Partial<Supervisor>) => void;
  removeSupervisor: (id: string) => void;
  /** personId optional — omit to create a brand-new person, pass it to link an existing person into this project. */
  addWorker: (w: Omit<ManagedWorker, 'id' | 'personId'> & { personId?: string }) => void;
  removeWorker: (id: string) => void;
  /** Update Worker Master fields (KYC, bank, contact, photo, etc.). */
  updateWorker: (id: string, patch: Partial<ManagedWorker>) => void;
  /** Shift a worker to another site (multi-site) — optionally under a supervisor there. */
  moveWorker: (id: string, toProjectId: string, toSupervisorId?: string) => void;
  /** Move a supervisor (and, optionally, their whole team) to another site. */
  moveSupervisor: (id: string, toProjectId: string, withTeam?: boolean) => void;
  // ---- Flats / units + sales ----
  addUnit: (u: Omit<Unit, 'id' | 'status'> & { status?: UnitStatus }) => void;
  updateUnit: (id: string, patch: Partial<Unit>) => void;
  removeUnit: (id: string) => void;
  addUnitDoc: (unitId: string, doc: Omit<UnitDoc, 'id'>) => void;
  removeUnitDoc: (unitId: string, docId: string) => void;
  mark: (date: string, workerId: string, m: AttendanceMark, stamp?: AttendanceStamp) => void;
  setOvertime: (date: string, workerId: string, hours: number) => void;
  addExpense: (e: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  /** Reimburse a supervisor — marks all their unsettled expenses as settled. */
  settleSupervisorExpenses: (supervisorId: string) => void;
  addAdvance: (a: Omit<Advance, 'id'>) => void;
  removeAdvance: (id: string) => void;
  /** Record a wage payment to a worker for a pay period. */
  addPayout: (p: Omit<Payout, 'id'>) => void;
  /**
   * Merge server truth for a project into the board (two-way sync). Records this
   * device created keep their local id (recognised via the id-map); records from
   * OTHER devices are added under their server id. Never overwrites an unsynced
   * local attendance mark — server only fills gaps.
   */
  hydrateProject: (projectId: string, data: {
    supervisors?: any[];
    workers?: any[];
    attendance?: any[];
  }) => void;
}

let seq = 100;
const id = (p: string) => `${p}_${++seq}`;

// No seed/mock data — the workforce board starts empty and is filled by the user.
/** Queue a write to the backend and nudge the sync engine (no-op while offline). */
const sync = (op: Parameters<typeof outbox.enqueue>[0]) => { outbox.enqueue(op); void runSync(); };

export const useWorkforceStore = create<WorkforceState>()(
  persist(
    (set, get) => {
      /**
       * Mirror the current mark + overtime for a worker/date to the backend as one
       * upsert. Reads state AFTER the local mutation so both fields stay consistent,
       * and is idempotent server-side so repeats are safe.
       */
      const syncAttendance = (date: string, workerId: string) => {
        const st = get();
        const worker = st.workers.find((w) => w.id === workerId);
        if (!worker) return;
        const stamp = st.attendanceMeta[date]?.[workerId];
        sync({
          entity: 'attendance',
          dedupeKey: `att:${workerId}:${date}`,
          payload: {
            projectId: worker.projectId,
            workerId,
            date,
            status: st.attendance[date]?.[workerId] ?? 'P',
            overtime: st.overtime[date]?.[workerId] ?? 0,
            lat: stamp?.lat,
            lng: stamp?.lng,
          },
        });
      };
      return ({
      projects: [],
      activeProjectId: '',
      supervisors: [],
      workers: [],
      attendance: {},
      attendanceMeta: {},
      overtime: {},
      expenses: [],
      advances: [],
      payouts: [],
      units: [],

      addProject: (name, photo) => set((st) => {
        const pid = id('p');
        return { projects: [...st.projects, { id: pid, name, photo }], activeProjectId: pid };
      }),
      setProjectPhoto: (pid, photo) => set((st) => ({
        projects: st.projects.map((p) => (p.id === pid ? { ...p, photo } : p)),
      })),
      removeProject: (pid) => set((st) => {
        const projects = st.projects.filter((p) => p.id !== pid);
        const removedWorkerIds = new Set(st.workers.filter((w) => w.projectId === pid).map((w) => w.id));
        return {
          projects,
          activeProjectId: st.activeProjectId === pid ? (projects[0]?.id ?? '') : st.activeProjectId,
          supervisors: st.supervisors.filter((s) => s.projectId !== pid),
          workers: st.workers.filter((w) => w.projectId !== pid),
          expenses: st.expenses.filter((e) => e.projectId !== pid),
          advances: st.advances.filter((a) => !removedWorkerIds.has(a.workerId)),
        };
      }),
      setActiveProject: (pid) => set({ activeProjectId: pid }),
      ensureProject: (pid, name) => set((st) => ({
        activeProjectId: pid,
        projects: st.projects.some((p) => p.id === pid)
          ? st.projects.map((p) => (p.id === pid ? { ...p, name: name || p.name } : p))
          : [...st.projects, { id: pid, name: name || 'Project' }],
      })),
      setProjectLocation: (pid, location) => set((st) => ({
        projects: st.projects.map((p) => (p.id === pid ? { ...p, location } : p)),
      })),
      setProjectNotes: (pid, notes) => set((st) => ({
        projects: st.projects.map((p) => (p.id === pid ? { ...p, notes } : p)),
      })),
      addProjectDoc: (pid, doc) => set((st) => ({
        projects: st.projects.map((p) => (p.id === pid ? { ...p, documents: [{ ...doc, id: id('doc') }, ...(p.documents ?? [])] } : p)),
      })),
      removeProjectDoc: (pid, docId) => set((st) => ({
        projects: st.projects.map((p) => (p.id === pid ? { ...p, documents: (p.documents ?? []).filter((d) => d.id !== docId) } : p)),
      })),

      addSupervisor: (s) => {
        const sid = id('sup');
        sync({ entity: 'supervisor', localId: sid, payload: { projectId: s.projectId, name: s.name, phone: s.phone, site: s.site } });
        set((st) => ({ supervisors: [...st.supervisors, { ...s, id: sid }] }));
      },
      updateSupervisor: (sid, patch) => set((st) => ({ supervisors: st.supervisors.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })),
      removeSupervisor: (sid) => set((st) => ({
        supervisors: st.supervisors.filter((s) => s.id !== sid),
        workers: st.workers.filter((w) => w.supervisorId !== sid),
      })),
      addWorker: (w) => {
        const wid = id('w');
        // New person → personId = own id; linked person → caller passes their personId.
        sync({
          entity: 'worker',
          localId: wid,
          payload: {
            projectId: w.projectId, supervisorId: w.supervisorId, name: w.name, trade: w.trade, emoji: w.emoji,
            dayRate: w.dayRate, photo: w.photo, mobile: w.mobile, dob: w.dob, gender: w.gender, address: w.address,
            skill: w.skill, joinedOn: w.joinedOn, aadhaar: w.aadhaar, pan: w.pan, bankName: w.bankName,
            accountNo: w.accountNo, ifsc: w.ifsc, upiId: w.upiId, emergencyName: w.emergencyName, emergencyPhone: w.emergencyPhone,
          },
        });
        set((st) => ({ workers: [...st.workers, { ...w, id: wid, personId: w.personId || wid }] }));
      },
      removeWorker: (wid) => set((st) => ({ workers: st.workers.filter((w) => w.id !== wid) })),
      updateWorker: (wid, patch) => set((st) => ({ workers: st.workers.map((w) => (w.id === wid ? { ...w, ...patch } : w)) })),
      moveWorker: (wid, toProjectId, toSupervisorId) => set((st) => ({
        workers: st.workers.map((w) => (w.id === wid ? { ...w, projectId: toProjectId, supervisorId: toSupervisorId ?? '' } : w)),
      })),
      moveSupervisor: (sid, toProjectId, withTeam) => set((st) => ({
        supervisors: st.supervisors.map((s) => (s.id === sid ? { ...s, projectId: toProjectId } : s)),
        workers: withTeam ? st.workers.map((w) => (w.supervisorId === sid ? { ...w, projectId: toProjectId } : w)) : st.workers,
      })),
      addUnit: (u) => set((st) => ({ units: [...st.units, { ...u, id: id('unit'), status: u.status ?? 'available' }] })),
      updateUnit: (uid, patch) => set((st) => ({ units: st.units.map((u) => (u.id === uid ? { ...u, ...patch } : u)) })),
      removeUnit: (uid) => set((st) => ({ units: st.units.filter((u) => u.id !== uid) })),
      addUnitDoc: (uid, doc) => set((st) => ({
        units: st.units.map((u) => (u.id === uid ? { ...u, documents: [{ ...doc, id: id('udoc') }, ...(u.documents ?? [])] } : u)),
      })),
      removeUnitDoc: (uid, docId) => set((st) => ({
        units: st.units.map((u) => (u.id === uid ? { ...u, documents: (u.documents ?? []).filter((d) => d.id !== docId) } : u)),
      })),
      mark: (date, workerId, m, stamp) => {
        set((st) => ({
          attendance: { ...st.attendance, [date]: { ...(st.attendance[date] ?? {}), [workerId]: m } },
          attendanceMeta: stamp
            ? { ...st.attendanceMeta, [date]: { ...(st.attendanceMeta[date] ?? {}), [workerId]: stamp } }
            : st.attendanceMeta,
        }));
        syncAttendance(date, workerId);
      },
      setOvertime: (date, workerId, hours) => {
        set((st) => ({
          overtime: { ...st.overtime, [date]: { ...(st.overtime[date] ?? {}), [workerId]: hours } },
        }));
        syncAttendance(date, workerId);
      },
      addExpense: (e) => {
        const eid = id('e');
        sync({ entity: 'expense', localId: eid, payload: { projectId: e.projectId, category: e.category, title: e.title, amount: e.amount, date: e.date, paidBy: e.paidBy, settled: e.settled } });
        set((st) => ({ expenses: [{ ...e, id: eid }, ...st.expenses] }));
      },
      removeExpense: (eid) => set((st) => ({ expenses: st.expenses.filter((e) => e.id !== eid) })),
      settleSupervisorExpenses: (sid) => set((st) => ({
        expenses: st.expenses.map((e) => (e.paidBy === sid && !e.settled ? { ...e, settled: true } : e)),
      })),
      addAdvance: (a) => {
        const aid = id('adv');
        sync({ entity: 'advance', localId: aid, payload: { workerId: a.workerId, amount: a.amount, date: a.dateKey, note: a.note } });
        set((st) => ({ advances: [{ ...a, id: aid }, ...st.advances] }));
      },
      removeAdvance: (aid) => set((st) => ({ advances: st.advances.filter((a) => a.id !== aid) })),
      addPayout: (p) => {
        const payId = id('pay');
        sync({ entity: 'payout', localId: payId, payload: { projectId: p.projectId, workerId: p.workerId, amount: p.amount, periodKey: p.periodKey, date: p.dateKey } });
        set((st) => ({ payouts: [{ ...p, id: payId }, ...st.payouts] }));
      },

      hydrateProject: (projectId, data) => set((st) => {
        const pid = String(projectId);

        // Supervisors — add any this device doesn't already hold (own or prior hydrate).
        let supervisors = st.supervisors;
        for (const s of data.supervisors ?? []) {
          const localId = localForServer(String(s.suprvsr_id)) ?? String(s.suprvsr_id);
          if (supervisors.some((x) => x.id === localId)) continue;
          supervisors = [...supervisors, {
            id: localId, projectId: pid, name: s.nm_tx ?? 'Supervisor',
            phone: s.phone_tx ?? '', site: s.site_tx ?? '',
          }];
        }

        // Workers — same rule; map their supervisor to its local id when we have one.
        let workers = st.workers;
        for (const w of data.workers ?? []) {
          const localId = localForServer(String(w.workr_id)) ?? String(w.workr_id);
          if (workers.some((x) => x.id === localId)) continue;
          const supId = w.suprvsr_id != null ? (localForServer(String(w.suprvsr_id)) ?? String(w.suprvsr_id)) : '';
          workers = [...workers, {
            id: localId, projectId: pid, personId: localId,
            name: w.nm_tx ?? 'Worker', trade: w.trade_tx ?? 'Worker', emoji: w.emoji_tx ?? '👷',
            supervisorId: supId, dayRate: Number(w.day_rate_am) || 0,
            mobile: w.mobile_tx ?? undefined, skill: w.skill_cd ?? undefined, upiId: w.upi_tx ?? undefined,
          }];
        }

        // Attendance — server FILLS GAPS only, never clobbers an unsynced local mark.
        let attendance = st.attendance;
        let overtime = st.overtime;
        for (const a of data.attendance ?? []) {
          const wid = localForServer(String(a.workr_id)) ?? String(a.workr_id);
          const date = typeof a.atndnc_dt === 'string' ? a.atndnc_dt.slice(0, 10) : '';
          if (!date) continue;
          if (!attendance[date]?.[wid]) {
            attendance = { ...attendance, [date]: { ...(attendance[date] ?? {}), [wid]: (a.sts_cd || 'P') as AttendanceMark } };
          }
          if (a.ot_hrs && !overtime[date]?.[wid]) {
            overtime = { ...overtime, [date]: { ...(overtime[date] ?? {}), [wid]: Number(a.ot_hrs) } };
          }
        }

        return { supervisors, workers, attendance, overtime };
      }),
      });
    },
    {
      name: 'nirmaan-workforce',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      // v1 had no projects — wrap any existing data into one default project.
      // v3 adds personId (shared-worker identity).
      // v4 drops the old seeded demo projects/workers — start clean.
      migrate: (persisted, version) => {
        const st = persisted as Partial<WorkforceState> & Record<string, unknown>;
        if (version < 4) {
          // Clear any previously-seeded demo data.
          st.projects = []; st.activeProjectId = ''; st.supervisors = []; st.workers = [];
          st.attendance = {}; st.attendanceMeta = {}; st.overtime = {}; st.expenses = []; st.advances = []; st.payouts = []; st.units = [];
          return st as WorkforceState;
        }
        if (version < 2) {
          const pid = 'p1';
          st.projects = (st.projects as Project[] | undefined) ?? [{ id: pid, name: 'My Project' }];
          st.activeProjectId = (st.activeProjectId as string | undefined) ?? pid;
          st.supervisors = ((st.supervisors as Supervisor[] | undefined) ?? []).map((s) => ({ ...s, projectId: s.projectId ?? pid }));
          st.workers = ((st.workers as ManagedWorker[] | undefined) ?? []).map((w) => ({ ...w, projectId: w.projectId ?? pid }));
          st.expenses = ((st.expenses as Expense[] | undefined) ?? []).map((e) => ({ ...e, projectId: e.projectId ?? pid }));
        }
        if (version < 3) {
          // Existing workers each become their own person.
          st.workers = ((st.workers as ManagedWorker[] | undefined) ?? []).map((w) => ({ ...w, personId: w.personId ?? w.id }));
        }
        return st as WorkforceState;
      },
    },
  ),
);

export const EXPENSE_META: Record<ExpenseCategory, { label: string; emoji: string }> = {
  material: { label: 'Materials', emoji: '📦' },
  labour: { label: 'Labour', emoji: '👷' },
  equipment: { label: 'Equipment', emoji: '🛠️' },
  transport: { label: 'Transport', emoji: '🚚' },
  misc: { label: 'Misc', emoji: '🧾' },
};
