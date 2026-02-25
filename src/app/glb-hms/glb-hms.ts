import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type UserRole = 'Doctor' | 'Staff' | 'Patient' | 'Admin' | 'Pharmacist';
type VisitType = 'In-Person' | 'Online';
type AppointmentStatus = 'Scheduled' | 'Waiting' | 'Completed' | 'Request';
type PortalTab = 'dashboard' | 'home' | 'chat' | 'settings';
type StaffHomeTab = 'query' | 'desk' | 'live' | 'vitals' | 'care' | 'bed';
type DoctorHomeTab = 'focus' | 'queue' | 'schedule' | 'waiting' | 'others';
type Triage = 'Low' | 'Medium' | 'High';
type BedStatus = 'Stable' | 'Critical' | 'Pending Discharge';
type OrderStatus = 'Queued' | 'Verifying' | 'Ready for Pickup' | 'Out for Delivery';

interface Appointment {
  id: string;
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  type: VisitType;
  status: AppointmentStatus;
}

interface WaitingPatient {
  id: string;
  patientId: string;
  patientName: string;
  waitMinutes: number;
  triage: Triage;
}

interface NurseVitalsRecord {
  patientId: string;
  patientName: string;
  bp: string;
  temp: string;
  pulse: string;
  notes: string;
  triage: Triage;
  savedAt: string;
}

interface TaskItem {
  id: string;
  label: string;
  done: boolean;
}

interface PatientRecord {
  id: string;
  name: string;
  lane: 'Inpatient' | 'Outpatient';
  bedStatus: BedStatus;
}

interface ChatMessage {
  id: string;
  from: string;
  target: string;
  body: string;
  time: string;
}

interface PharmacyOrder {
  id: string;
  patientName: string;
  prescribedBy: string;
  medicine: string;
  signature: string;
  interactionChecked: boolean;
  allergyChecked: boolean;
  status: OrderStatus;
}

interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  enabled: boolean;
  mfaRequired: boolean;
}

interface RefillRequest {
  id: string;
  drug: string;
  status: 'Requested' | 'Approved' | 'Rejected';
}

interface Vitals {
  bp: string;
  temp: number;
  pulse: number;
  oxygen: number;
}

const TODAY = toYMD(new Date());
const YESTERDAY = toYMD(shiftDay(new Date(), -1));
const TOMORROW = toYMD(shiftDay(new Date(), 1));

@Component({
  selector: 'glb-hms-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './glb-hms.html',
  styleUrls: ['./glb-hms.scss']
})
export class GlbHmsComponent implements OnDestroy {
  role = signal<UserRole>('Doctor');
  isAuthenticated = signal(false);
  userName = signal('Dr. Sarah Miller');
  activeTab = signal<PortalTab>('home');
  staffHomeTab = signal<StaffHomeTab>('query');
  doctorHomeTab = signal<DoctorHomeTab>('focus');
  isVideoActive = signal(false);
  selectedDate = signal(TODAY);
  reqType = signal<VisitType>('Online');

  selectedAppointmentId = signal<string | null>(null);
  patientSearch = signal('');
  chatTarget = signal('Staff');
  chatDraft = signal('');
  requestTime = signal('10:30 AM');
  refillDrug = signal('Atorvastatin 10mg');
  staffBookPatientId = signal('p4');
  staffBookType = signal<VisitType>('In-Person');
  staffBookTime = signal('11:30 AM');
  prescribedDrug = signal('');
  orderedLab = signal('');
  clinicalComments = signal('');
  vitalsBp = signal('');
  vitalsTemp = signal('');
  vitalsPulse = signal('');
  eSign = signal('Dr. Sarah Miller');
  pharmacyQuery = signal('');
  checkedInPatientIds = signal<Set<string>>(new Set());
  selectedWaitingId = signal<string | null>(null);
  selectedVitalsPatientId = signal<string | null>(null);
  selectedVitalsPatientName = signal('');
  selectedVitalsTriage = signal<Triage>('Low');
  nurseVitalsBp = signal('');
  nurseVitalsTemp = signal('');
  nurseVitalsPulse = signal('');
  nurseVitalsNotes = signal('');
  liveTriagePickerId = signal<string | null>(null);

  readonly timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'];

  readonly appointments = signal<Appointment[]>([
    { id: 'a1', date: TODAY, time: '09:00 AM', patientId: 'p1', patientName: 'Jane Smith', doctorName: 'Dr. Sarah Miller', type: 'Online', status: 'Scheduled' },
    { id: 'a2', date: TODAY, time: '10:30 AM', patientId: 'p2', patientName: 'Robert Fox', doctorName: 'Dr. Sarah Miller', type: 'In-Person', status: 'Waiting' },
    { id: 'a3', date: TODAY, time: '12:00 PM', patientId: 'p3', patientName: 'Emily Chen', doctorName: 'Dr. Sarah Miller', type: 'Online', status: 'Scheduled' },
    { id: 'a4', date: YESTERDAY, time: '09:30 AM', patientId: 'p2', patientName: 'Robert Fox', doctorName: 'Dr. Sarah Miller', type: 'In-Person', status: 'Completed' },
    { id: 'a5', date: TOMORROW, time: '10:00 AM', patientId: 'p4', patientName: 'Mark Johnson', doctorName: 'Dr. Sarah Miller', type: 'In-Person', status: 'Scheduled' }
  ]);

  readonly waitingList = signal<WaitingPatient[]>([
    { id: 'w1', patientId: 'p2', patientName: 'Robert Fox', waitMinutes: 14, triage: 'Medium' },
    { id: 'w2', patientId: 'p5', patientName: 'Linda Bell', waitMinutes: 27, triage: 'Low' }
  ]);

  readonly doctorQueue = signal<NurseVitalsRecord[]>([]);

  readonly patients = signal<PatientRecord[]>([
    { id: 'p1', name: 'Jane Smith', lane: 'Outpatient', bedStatus: 'Stable' },
    { id: 'p2', name: 'Robert Fox', lane: 'Inpatient', bedStatus: 'Critical' },
    { id: 'p3', name: 'Emily Chen', lane: 'Outpatient', bedStatus: 'Stable' },
    { id: 'p4', name: 'Mark Johnson', lane: 'Inpatient', bedStatus: 'Pending Discharge' },
    { id: 'p5', name: 'Linda Bell', lane: 'Outpatient', bedStatus: 'Stable' }
  ]);

  readonly tasks = signal<TaskItem[]>([
    { id: 't1', label: 'Administer 10:00 AM antibiotics - Ward A', done: false },
    { id: 't2', label: 'Record 11:00 AM vitals - Robert Fox', done: false },
    { id: 't3', label: 'Discharge documentation - Mark Johnson', done: true }
  ]);

  readonly chatMessages = signal<ChatMessage[]>([
    { id: 'm1', from: 'Staff', target: 'Doctor', body: 'Room 4 patient is ready for rounds.', time: '09:04' },
    { id: 'm2', from: 'Doctor', target: 'Staff', body: 'Acknowledged. Starting now.', time: '09:06' },
    { id: 'm3', from: 'Patient', target: 'Doctor', body: 'Can I shift my follow-up to online?', time: '09:15' },
    { id: 'm4', from: 'Pharmacist', target: 'Doctor', body: 'Please confirm amoxicillin dosage.', time: '09:19' }
  ]);

  readonly pharmacyOrders = signal<PharmacyOrder[]>([
    {
      id: 'rx-1',
      patientName: 'Robert Fox',
      prescribedBy: 'Dr. Sarah Miller',
      medicine: 'Amoxicillin 500mg',
      signature: 'Dr. Sarah Miller',
      interactionChecked: true,
      allergyChecked: true,
      status: 'Queued'
    }
  ]);

  readonly users = signal<UserAccount[]>([
    { id: 'u1', name: 'Dr. Sarah Miller', role: 'Doctor', enabled: true, mfaRequired: true },
    { id: 'u2', name: 'Nurse Jessica', role: 'Staff', enabled: true, mfaRequired: true },
    { id: 'u3', name: 'Liam Patel', role: 'Pharmacist', enabled: true, mfaRequired: true },
    { id: 'u4', name: 'Mia Davis', role: 'Admin', enabled: true, mfaRequired: true }
  ]);

  readonly auditLogs = signal<string[]>([
    '[09:01] Doctor viewed patient timeline: #PT-9921',
    '[09:08] Staff updated waiting room triage to Medium',
    '[09:12] Pharmacist changed Rx status to Verifying'
  ]);

  readonly refillRequests = signal<RefillRequest[]>([
    { id: 'rf-1', drug: 'Metformin 500mg', status: 'Requested' }
  ]);

  readonly patientCarePlans = ['Low-sodium diet', 'Daily 20-min walk', 'Blood pressure review in 2 weeks'];
  readonly patientLabs = ['CBC: Normal', 'HbA1c: 6.8%', 'Lipid panel: Borderline high'];

  readonly liveVitals = signal<Vitals>({ bp: '122/79', temp: 98.6, pulse: 76, oxygen: 98 });

  readonly userInitials = computed(() => {
    const parts = this.userName().split(' ');
    return parts.length > 1 ? parts[parts.length - 1].substring(0, 2).toUpperCase() : 'CC';
  });

  readonly todaysAppointments = computed(() =>
    this.appointments()
      .filter((a) => a.date === this.selectedDate())
      .sort((a, b) => this.timeSlots.indexOf(a.time) - this.timeSlots.indexOf(b.time))
  );

  readonly nextPatient = computed(() => this.todaysAppointments().find((a) => a.status !== 'Completed') ?? null);

  readonly lastSeenPatient = computed(() => {
    const list = this.appointments().filter((a) => a.status === 'Completed');
    return list.length ? list[list.length - 1] : null;
  });

  readonly selectedAppointment = computed(() => {
    const id = this.selectedAppointmentId();
    return id ? this.appointments().find((a) => a.id === id) ?? null : null;
  });

  readonly inpatientCount = computed(() => this.patients().filter((p) => p.lane === 'Inpatient').length);
  readonly outpatientCount = computed(() => this.patients().filter((p) => p.lane === 'Outpatient').length);

  readonly filteredPatients = computed(() => {
    const q = this.patientSearch().trim().toLowerCase();
    const checkedInIds = this.checkedInPatientIds();
    const list = this.patients().filter((p) => !checkedInIds.has(p.id));
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  });

  readonly selectedWaitingPatient = computed(() => {
    const id = this.selectedWaitingId();
    return id ? this.waitingList().find((w) => w.id === id) ?? null : null;
  });

  readonly nurseVitalsRecords = computed(() => this.doctorQueue());

  readonly chatTargets = computed(() => {
    const current = this.role();
    if (current === 'Doctor') return ['Staff', 'Patient', 'Pharmacist'];
    if (current === 'Staff') return ['Doctor'];
    if (current === 'Patient') return ['Doctor'];
    if (current === 'Pharmacist') return ['Doctor'];
    return ['Doctor', 'Staff', 'Pharmacist'];
  });

  readonly visibleMessages = computed(() => {
    const me = this.role();
    const target = this.chatTarget();
    return this.chatMessages().filter((m) => {
      const direct = (m.from === me && m.target === target) || (m.from === target && m.target === me);
      const adminVisible = me === 'Admin' && (m.from === target || m.target === target);
      return direct || adminVisible;
    });
  });

  readonly analytics = computed(() => ({
    throughput: this.appointments().filter((a) => a.status === 'Completed').length,
    activeWaiting: this.waitingList().length,
    responseMinutes: 3.8,
    totalUsers: this.users().length
  }));

  readonly doctorsAvailableCount = computed(
    () => this.users().filter((u) => u.role === 'Doctor' && u.enabled).length
  );

  readonly doctorDashboardMetrics = computed(() => ({
    visitedToday: this.appointments().filter((a) => a.date === this.selectedDate() && a.status === 'Completed').length,
    inQueue: this.doctorQueue().length,
    waitingList: this.waitingList().length,
    doctorsAvailable: this.doctorsAvailableCount(),
    onlineVisitsToday: this.appointments().filter((a) => a.date === this.selectedDate() && a.type === 'Online').length
  }));

  readonly staffDashboardMetrics = computed(() => ({
    checkedInToday: this.checkedInPatientIds().size,
    waitingNow: this.waitingList().length,
    doctorQueue: this.doctorQueue().length,
    criticalCases: this.waitingList().filter((w) => w.triage === 'High').length,
    openTasks: this.tasks().filter((t) => !t.done).length
  }));

  private ticker = setInterval(() => {
    const current = this.liveVitals();
    const nextTemp = Number((current.temp + (Math.random() - 0.5) * 0.2).toFixed(1));
    const nextPulse = clamp(Math.round(current.pulse + (Math.random() - 0.5) * 4), 68, 102);
    const nextOxygen = clamp(Math.round(current.oxygen + (Math.random() - 0.5) * 2), 95, 100);
    this.liveVitals.set({ ...current, temp: nextTemp, pulse: nextPulse, oxygen: nextOxygen });

    this.waitingList.update((list) => list.map((p) => ({ ...p, waitMinutes: p.waitMinutes + 1 })));
  }, 10000);

  ngOnDestroy(): void {
    clearInterval(this.ticker);
  }

  setRole(role: UserRole): void {
    this.role.set(role);
    this.selectedAppointmentId.set(null);
    this.activeTab.set('home');
    this.staffHomeTab.set('query');
    this.doctorHomeTab.set('focus');
    this.chatTarget.set(role === 'Patient' ? 'Doctor' : 'Staff');

    if (role === 'Patient') this.userName.set('Jane Smith');
    else if (role === 'Staff') this.userName.set('Nurse Jessica');
    else if (role === 'Pharmacist') this.userName.set('Liam Patel');
    else if (role === 'Admin') this.userName.set('Mia Davis');
    else this.userName.set('Dr. Sarah Miller');
  }

  login(): void {
    this.isAuthenticated.set(true);
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.selectedAppointmentId.set(null);
    this.selectedWaitingId.set(null);
    this.selectedVitalsPatientId.set(null);
  }

  selectPatient(apptId: string): void {
    this.selectedAppointmentId.set(apptId);
  }

  getApptForSlot(time: string): Appointment | null {
    return this.todaysAppointments().find((a) => a.time === time) ?? null;
  }

  toggleVideo(state: boolean): void {
    this.isVideoActive.set(state);
  }

  markVisitComplete(): void {
    const selected = this.selectedAppointment();
    if (!selected) return;

    this.appointments.update((list) => list.map((a) => (a.id === selected.id ? { ...a, status: 'Completed' } : a)));

    if (this.vitalsBp().trim()) {
      this.liveVitals.update((v) => ({
        ...v,
        bp: this.vitalsBp().trim(),
        temp: Number(this.vitalsTemp() || v.temp),
        pulse: Number(this.vitalsPulse() || v.pulse)
      }));
    }

    if (this.prescribedDrug().trim() && this.eSign().trim()) {
      this.pharmacyOrders.update((list) => [
        {
          id: `rx-${Date.now()}`,
          patientName: selected.patientName,
          prescribedBy: this.userName(),
          medicine: this.prescribedDrug().trim(),
          signature: this.eSign().trim(),
          interactionChecked: false,
          allergyChecked: false,
          status: 'Queued'
        },
        ...list
      ]);
      this.auditLogs.update((logs) => [`[${clock()}] Visit completed and Rx sent to pharmacy for ${selected.patientName}`, ...logs]);
    }

    this.doctorQueue.update((queue) => queue.filter((q) => q.patientId !== selected.patientId));
    this.checkedInPatientIds.update((ids) => {
      const next = new Set(ids);
      next.delete(selected.patientId);
      return next;
    });

    this.selectedAppointmentId.set(null);
    this.clinicalComments.set('');
    this.prescribedDrug.set('');
    this.orderedLab.set('');
    this.vitalsBp.set('');
    this.vitalsTemp.set('');
    this.vitalsPulse.set('');
  }

  authorizePrescription(): void {
    const selected = this.selectedAppointment();
    if (!selected || !this.prescribedDrug().trim() || !this.eSign().trim()) return;

    this.pharmacyOrders.update((list) => [
      {
        id: `rx-${Date.now()}`,
        patientName: selected.patientName,
        prescribedBy: this.userName(),
        medicine: this.prescribedDrug().trim(),
        signature: this.eSign().trim(),
        interactionChecked: false,
        allergyChecked: false,
        status: 'Queued'
      },
      ...list
    ]);

    this.auditLogs.update((logs) => [`[${clock()}] Prescription authorized for ${selected.patientName}`, ...logs]);
    this.prescribedDrug.set('');
    this.orderedLab.set('');
  }

  checkInPatient(patientId: string): void {
    const p = this.patients().find((x) => x.id === patientId);
    if (!p) return;

    const inList = this.waitingList().some((w) => w.patientId === p.id);
    if (!inList) {
      this.waitingList.update((list) => [
        { id: `w-${Date.now()}`, patientId: p.id, patientName: p.name, waitMinutes: 0, triage: 'Low' },
        ...list
      ]);
    }
    this.checkedInPatientIds.update((ids) => new Set([...ids, p.id]));

    const existing = this.appointments().find((a) => a.date === this.selectedDate() && a.patientId === patientId);
    if (existing) {
      this.appointments.update((list) =>
        list.map((a) => (a.id === existing.id ? { ...a, status: 'Waiting' } : a))
      );
    } else {
      const fallbackTime = this.timeSlots.find((slot) => !this.todaysAppointments().some((a) => a.time === slot)) ?? this.timeSlots[0];
      this.appointments.update((list) => [
        ...list,
        {
          id: `a-${Date.now()}`,
          date: this.selectedDate(),
          time: fallbackTime,
          patientId: p.id,
          patientName: p.name,
          doctorName: 'Dr. Sarah Miller',
          type: 'In-Person',
          status: 'Waiting'
        }
      ]);
    }
  }

  bookAppointment(): void {
    const patient = this.patients().find((p) => p.id === this.staffBookPatientId());
    if (!patient) return;

    this.appointments.update((list) => [
      ...list,
      {
        id: `a-${Date.now()}`,
        date: this.selectedDate(),
        time: this.staffBookTime(),
        patientId: patient.id,
        patientName: patient.name,
        doctorName: 'Dr. Sarah Miller',
        type: this.staffBookType(),
        status: 'Scheduled'
      }
    ]);
  }

  updateTriage(waitingId: string, triage: Triage): void {
    this.waitingList.update((list) => list.map((w) => (w.id === waitingId ? { ...w, triage } : w)));
    if (this.selectedWaitingId() === waitingId) {
      this.selectedVitalsTriage.set(triage);
    }
    this.liveTriagePickerId.set(null);
  }

  toggleLiveTriagePicker(waitingId: string): void {
    this.liveTriagePickerId.set(this.liveTriagePickerId() === waitingId ? null : waitingId);
  }

  selectWaitingPatient(waitingId: string): void {
    const waiting = this.waitingList().find((w) => w.id === waitingId);
    if (!waiting) return;
    this.selectedWaitingId.set(waitingId);
    this.selectedVitalsPatientId.set(waiting.patientId);
    this.selectedVitalsPatientName.set(waiting.patientName);
    this.selectedVitalsTriage.set(waiting.triage);
    this.nurseVitalsBp.set('');
    this.nurseVitalsTemp.set('');
    this.nurseVitalsPulse.set('');
    this.nurseVitalsNotes.set('');
  }

  startVitalsFromLive(waitingId: string): void {
    this.selectWaitingPatient(waitingId);
    this.staffHomeTab.set('vitals');
  }

  editNurseVitalsRecord(patientId: string): void {
    const record = this.doctorQueue().find((r) => r.patientId === patientId);
    if (!record) return;
    this.selectedWaitingId.set(null);
    this.selectedVitalsPatientId.set(record.patientId);
    this.selectedVitalsPatientName.set(record.patientName);
    this.selectedVitalsTriage.set(record.triage);
    this.nurseVitalsBp.set(record.bp);
    this.nurseVitalsTemp.set(record.temp);
    this.nurseVitalsPulse.set(record.pulse);
    this.nurseVitalsNotes.set(record.notes);
    this.staffHomeTab.set('vitals');
  }

  saveNurseVitalsToDoctorQueue(): void {
    const patientId = this.selectedVitalsPatientId();
    if (!patientId || !this.nurseVitalsBp().trim() || !this.nurseVitalsTemp().trim() || !this.nurseVitalsPulse().trim()) return;

    const waiting = this.selectedWaitingPatient();
    const patientName = this.selectedVitalsPatientName() || waiting?.patientName || 'Unknown';
    const triage = this.selectedVitalsTriage();

    const record: NurseVitalsRecord = {
      patientId,
      patientName,
      bp: this.nurseVitalsBp().trim(),
      temp: this.nurseVitalsTemp().trim(),
      pulse: this.nurseVitalsPulse().trim(),
      notes: this.nurseVitalsNotes().trim(),
      triage,
      savedAt: clock()
    };

    this.doctorQueue.update((queue) => [record, ...queue.filter((q) => q.patientId !== patientId)]);
    if (waiting) {
      this.waitingList.update((list) => list.filter((w) => w.id !== waiting.id));
    }
    this.selectedWaitingId.set(null);
    this.selectedVitalsPatientId.set(null);
    this.selectedVitalsPatientName.set('');
    this.selectedVitalsTriage.set('Low');
    this.nurseVitalsBp.set('');
    this.nurseVitalsTemp.set('');
    this.nurseVitalsPulse.set('');
    this.nurseVitalsNotes.set('');
  }

  openDoctorQueuePatient(patientId: string): void {
    const appt = this.todaysAppointments().find((a) => a.patientId === patientId && a.status !== 'Completed');
    if (appt) {
      this.selectedAppointmentId.set(appt.id);
      this.vitalsBp.set('');
      this.vitalsTemp.set('');
      this.vitalsPulse.set('');
    }
  }

  toggleTask(taskId: string): void {
    this.tasks.update((list) => list.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
  }

  updateBedStatus(patientId: string, status: BedStatus): void {
    this.patients.update((list) => list.map((p) => (p.id === patientId ? { ...p, bedStatus: status } : p)));
  }

  escalateMessage(waitingId: string): void {
    const waiting = this.waitingList().find((w) => w.id === waitingId);
    if (!waiting) return;
    this.chatMessages.update((list) => [
      ...list,
      { id: `m-${Date.now()}`, from: 'Staff', target: 'Doctor', body: `Triage escalation: ${waiting.patientName} (${waiting.triage})`, time: clock() }
    ]);
    this.activeTab.set('chat');
    this.chatTarget.set('Doctor');
  }

  submitAppointmentRequest(): void {
    this.appointments.update((list) => [
      ...list,
      {
        id: `rq-${Date.now()}`,
        date: this.selectedDate(),
        time: this.requestTime(),
        patientId: 'p1',
        patientName: 'Jane Smith',
        doctorName: 'Dr. Sarah Miller',
        type: this.reqType(),
        status: 'Request'
      }
    ]);
  }

  submitRefillRequest(): void {
    if (!this.refillDrug().trim()) return;
    this.refillRequests.update((list) => [{ id: `rf-${Date.now()}`, drug: this.refillDrug().trim(), status: 'Requested' }, ...list]);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    this.pharmacyOrders.update((list) => list.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  runSafetyCheck(orderId: string): void {
    this.pharmacyOrders.update((list) =>
      list.map((o) => (o.id === orderId ? { ...o, interactionChecked: true, allergyChecked: true, status: 'Verifying' } : o))
    );
  }

  sendPharmacyQuery(): void {
    if (!this.pharmacyQuery().trim()) return;
    this.chatMessages.update((list) => [
      ...list,
      { id: `m-${Date.now()}`, from: 'Pharmacist', target: 'Doctor', body: this.pharmacyQuery().trim(), time: clock() }
    ]);
    this.pharmacyQuery.set('');
  }

  toggleUserEnabled(userId: string): void {
    this.users.update((list) => list.map((u) => (u.id === userId ? { ...u, enabled: !u.enabled } : u)));
    this.auditLogs.update((logs) => [`[${clock()}] Admin changed account access for ${userId}`, ...logs]);
  }

  toggleMfa(userId: string): void {
    this.users.update((list) => list.map((u) => (u.id === userId ? { ...u, mfaRequired: !u.mfaRequired } : u)));
    this.auditLogs.update((logs) => [`[${clock()}] Admin changed MFA policy for ${userId}`, ...logs]);
  }

  sendMessage(): void {
    if (!this.chatDraft().trim()) return;
    this.chatMessages.update((list) => [
      ...list,
      { id: `m-${Date.now()}`, from: this.role(), target: this.chatTarget(), body: this.chatDraft().trim(), time: clock() }
    ]);
    this.chatDraft.set('');
  }

  get patientOnlineVisit(): Appointment | null {
    return (
      this.appointments().find((a) => a.patientName === 'Jane Smith' && a.type === 'Online' && a.date === this.selectedDate()) ??
      null
    );
  }
}

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

function shiftDay(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clock(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}
