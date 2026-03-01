import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Role = 'sw' | 'nurse' | 'doctor' | 'pharmacist' | 'lab' | 'admin';
type TabId = 'home' | 'cases' | 'route' | 'schedule' | 'setting' | 'patients';

interface PatientContext {
  name: string;
  disease: string;
  age: string;
  gender: string;
  id: string;
  lastVisit: string;
  doc: string;
  nurse: string;
}
interface Appointment {
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  id: string;
  time: string;
  date: string; // YYYY-MM-DD
}
interface Visit {
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  id: string;
  status: 'Vital Completed' | 'Open' | 'Closed';
  mode: 'In-Person' | 'Virtual';
  assignedDoctor: string;
  createdAt: number;
  date: string; // YYYY-MM-DD
}
interface PatientTriage {
  bp: string;
  glucose: string;
  hr: string;
  temp: string;
  ox: string;
  date: string;
}
interface PatientVisit {
  date: string;
  reason: string;
  doctor: string;
}
interface CarePlanItem {
  title: string;
  enrolled: string;
  tags: string[];
  status: 'active' | 'pending';
}
interface CarePlanMember {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: 'Male' | 'Female';
}
interface CarePlanTask {
  id: string;
  category: string;
  description: string;
  frequency: string;
  assignedTo: string;
  status: 'active' | 'pending';
}
interface CarePlan {
  id: string;
  name: string;
  description: string;
  defaultDoctor: { name: string; avatar: string };
  defaultNurse: { name: string; avatar: string };
  goals: { id: string; title: string; targetDate: string; progress: number }[];
  tasks: CarePlanTask[];
}
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  phone: string;
  doctorName: string;
  condition: string;
  initials: string;
  status: string;
  triage: PatientTriage;
  meds: string[];
  history: string[];
  lastVisits: PatientVisit[];
  carePlan: CarePlanItem[];
}

@Component({
  selector: 'app-mockup-v1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mockup-v1.component.html',
  styleUrl: './mockup-v1.component.scss'
})
export class MockupV1Component {
  selectedRole: Role = 'sw';
  staffId = 'SW-7821';
  password = '';

  loggedIn = false;
  loggingIn = false;

  activeTab: TabId = 'home';
  doctorVisitView: 'my' | 'all' = 'my';

  formOpen = false;
  fabMenuOpen = false;
  submitting = false;
  encounterSaved = false;

  formPatientName = 'New Adhoc Case';
  formDoctorName = 'Dr. Karl John';
  formNurseName = 'Julie';

  currentPatient: PatientContext | null = null;
  selectedVisitPatient = '';
  readonly patientSearchOptions = ['David'];
  readonly appointments: Appointment[] = [
    { name: 'Michael Johnson', age: 66, gender: 'Male', id: 'A-1001', time: '09:15 AM', date: this.todayIso() },
    { name: 'Emily Davis', age: 58, gender: 'Female', id: 'A-1002', time: '10:00 AM', date: this.todayIso() },
    { name: 'Christopher Miller', age: 71, gender: 'Male', id: 'A-1003', time: '11:30 AM', date: this.todayIso() },
    { name: 'Olivia Garcia', age: 63, gender: 'Female', id: 'A-1004', time: '01:00 PM', date: this.todayIso() },
    { name: 'Daniel Wilson', age: 69, gender: 'Male', id: 'A-1005', time: '02:45 PM', date: this.todayIso() }
  ];
  selectedScheduleDate = this.todayIso();
  scheduleWeekStart = this.getWeekStart(new Date());
  selectedVisitDate = this.todayIso();
  visitWeekStart = this.getWeekStart(new Date());
  visits: Visit[] = [];
  currentVisitId: string | null = null;
  doctorMedicines = '';
  doctorNotes = '';
  doctorFollowUpDays: number | null = null;
  selectedLabTests: string[] = [];
  readonly labTestOptions = ['CBC', 'HbA1c', 'Lipid Panel', 'X-Ray', 'MRI'];
  viewMode = signal<'list' | 'profile'>('list');
  carePlanView = signal<'none' | 'dashboard' | 'patient-profile'>('none');
  activePlan = signal<CarePlan | null>(null);
  patients = signal<Patient[]>([
    {
      id: 'MRN-7721',
      name: 'Elena Rodriguez',
      age: 54,
      gender: 'Female',
      phone: '+1 555-0123',
      doctorName: 'Dr. Jenkins',
      condition: 'Hypertension',
      initials: 'ER',
      status: 'Follow-up',
      triage: { bp: '142/92', glucose: '110', hr: '78', temp: '98.4', ox: '98', date: 'Oct 24, 2023' },
      meds: ['Lisinopril 10mg', 'Amlodipine 5mg'],
      history: ['Stage 2 Hypertension', 'Family hx of stroke'],
      lastVisits: [
        { date: 'Sep 12, 2023', reason: 'Routine Checkup', doctor: 'Dr. Jenkins' },
        { date: 'Jul 05, 2023', reason: 'BP Spike Emergency', doctor: 'Dr. Sarah M.' }
      ],
      carePlan: [
        { title: 'Hypertension Care', enrolled: '2 Patients Enrolled', tags: ['NCD SUPPORT', 'CHRONIC'], status: 'active' }
      ]
    },
    {
      id: 'MRN-4490',
      name: 'Samuel L. Jackson',
      age: 72,
      gender: 'Male',
      phone: '+1 555-9876',
      doctorName: 'Dr. Roberts',
      condition: 'Type 2 Diabetes',
      initials: 'SJ',
      status: 'Scheduled',
      triage: { bp: '128/80', glucose: '185', hr: '72', temp: '98.6', ox: '99', date: 'Oct 22, 2023' },
      meds: ['Metformin 500mg', 'Januvia'],
      history: ['Diabetes since 2015', 'Mild Retinopathy'],
      lastVisits: [
        { date: 'Aug 30, 2023', reason: 'Glucose Sync', doctor: 'Dr. Roberts' },
        { date: 'May 14, 2023', reason: 'Eye Exam', doctor: 'Dr. Vane' }
      ],
      carePlan: [
        { title: 'Diabetes Wellness', enrolled: '2 Patients Enrolled', tags: ['NCD SUPPORT', 'CHRONIC'], status: 'active' }
      ]
    },
    {
      id: 'MRN-2210',
      name: 'Amanda Waller',
      age: 48,
      gender: 'Female',
      phone: '+1 555-4433',
      doctorName: 'Dr. Jenkins',
      condition: 'Cardiac Care',
      initials: 'AW',
      status: 'Critical',
      triage: { bp: '130/88', glucose: '98', hr: '65', temp: '98.2', ox: '97', date: 'Oct 25, 2023' },
      meds: ['Atenolol 25mg', 'Baby Aspirin'],
      history: ['Post-MI (2021)', 'Hyperlipidemia'],
      lastVisits: [
        { date: 'Oct 01, 2023', reason: 'Post-Op Followup', doctor: 'Dr. Jenkins' },
        { date: 'Sep 15, 2023', reason: 'Lab Review', doctor: 'Dr. Jenkins' }
      ],
      carePlan: [
        { title: 'Hypertension Care', enrolled: '1 Patient Enrolled', tags: ['NCD SUPPORT', 'CHRONIC'], status: 'active' }
      ]
    }
  ]);
  selectedPatient = signal<Patient | null>(null);
  patientSearch = signal('');
  filteredPatients = computed(() => {
    const q = this.patientSearch().trim().toLowerCase();
    if (!q) return this.patients();
    return this.patients().filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  });
  carePlans = signal<CarePlan[]>([
    {
      id: 'PLAN-HBP',
      name: 'Hypertension Care',
      description: 'Comprehensive management of Stage 1 and 2 Hypertension with focus on medication and lifestyle changes.',
      defaultDoctor: { name: 'Dr. Karl John', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
      defaultNurse: { name: 'Nurse Julie', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Avery' },
      goals: [{ id: 'G1', title: 'Systolic < 130', targetDate: 'Q4 2023', progress: 75 }],
      tasks: [
        { id: 'T1', category: 'medication', description: 'Daily BP Medication Adherence', frequency: 'Daily', assignedTo: 'Patient', status: 'active' },
        { id: 'T2', category: 'vitals', description: 'Weekly BP Monitoring', frequency: 'Weekly', assignedTo: 'Nurse', status: 'active' }
      ]
    },
    {
      id: 'PLAN-DM2',
      name: 'Diabetes Wellness',
      description: 'Support for Type 2 Diabetes patients including glucose tracking and nutritionist-led diet plans.',
      defaultDoctor: { name: 'Dr. Sarah Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara' },
      defaultNurse: { name: 'Nurse Thompson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam' },
      goals: [{ id: 'G2', title: 'HbA1c < 7.0%', targetDate: 'Jan 2024', progress: 40 }],
      tasks: [
        { id: 'T3', category: 'vitals', description: 'Fasting Glucose Check', frequency: 'Daily', assignedTo: 'Patient', status: 'active' },
        { id: 'T4', category: 'lifestyle', description: 'Moderate Exercise', frequency: '3x / week', assignedTo: 'Patient', status: 'active' }
      ]
    }
  ]);

  readonly roleLabels: Record<Role, string> = {
    sw: 'Social Worker',
    nurse: 'Nurse',
    doctor: 'Doctor',
    pharmacist: 'Pharmacist',
    lab: 'Lab Technician',
    admin: 'Admin'
  };

  get isClinicalRole(): boolean {
    return this.selectedRole === 'doctor' || this.selectedRole === 'nurse';
  }

  get greeting(): string {
    if (this.selectedRole === 'doctor') return 'Hello, Dr. Karl John';
    if (this.selectedRole === 'nurse') return 'Hello, Julie';
    if (this.selectedRole === 'sw') return 'Hello, Sarah';
    return `Hello, ${this.roleLabels[this.selectedRole]}`;
  }

  get dashboardTitle(): string {
    if (this.selectedRole === 'doctor') return 'Doctor Dashboard';
    if (this.selectedRole === 'nurse') return 'Nurse Dashboard';
    if (this.selectedRole === 'sw') return 'Field Dashboard';
    return `${this.roleLabels[this.selectedRole]} Dashboard`;
  }

  get routeLabel(): string {
    return 'Route';
  }

  get scheduleLabel(): string {
    return this.isClinicalRole ? 'Schedule' : 'Settings';
  }

  get routeTitle(): string {
    return this.isClinicalRole ? 'Assigned Patients' : "Today's Route";
  }

  get formPatientDetails(): string {
    if (!this.currentPatient) return 'Pending Assignment';
    return `${this.currentPatient.age}Y • ${this.currentPatient.gender} • ID: ${this.currentPatient.id} • ${this.currentPatient.disease}`;
  }

  get showPatientVisit(): boolean {
    return this.selectedVisitPatient.trim().length > 0;
  }

  get scheduleWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(this.scheduleWeekStart);
      d.setDate(this.scheduleWeekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }
  get visitWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(this.visitWeekStart);
      d.setDate(this.visitWeekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  get scheduleMonthLabel(): string {
    return this.scheduleWeekStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
  get visitMonthLabel(): string {
    return this.visitWeekStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  get filteredAppointments(): Appointment[] {
    return this.appointments.filter((a) => a.date === this.selectedScheduleDate);
  }
  get filteredVisits(): Visit[] {
    return this.visits.filter((v) => v.date === this.selectedVisitDate);
  }
  get filteredMyDoctorVisits(): Visit[] {
    return this.myDoctorVisits.filter((v) => v.date === this.selectedVisitDate);
  }
  get filteredAllDoctorVisits(): Visit[] {
    return this.allDoctorVisits.filter((v) => v.date === this.selectedVisitDate);
  }

  isSelectedDay(day: Date): boolean {
    return this.toIsoDate(day) === this.selectedScheduleDate;
  }
  isVisitSelectedDay(day: Date): boolean {
    return this.toIsoDate(day) === this.selectedVisitDate;
  }

  selectScheduleDay(day: Date): void {
    this.selectedScheduleDate = this.toIsoDate(day);
  }
  selectVisitDay(day: Date): void {
    this.selectedVisitDate = this.toIsoDate(day);
  }

  changeScheduleWeek(deltaWeeks: number): void {
    const next = new Date(this.scheduleWeekStart);
    next.setDate(next.getDate() + deltaWeeks * 7);
    this.scheduleWeekStart = this.getWeekStart(next);
    this.selectedScheduleDate = this.toIsoDate(this.scheduleWeekStart);
  }
  changeVisitWeek(deltaWeeks: number): void {
    const next = new Date(this.visitWeekStart);
    next.setDate(next.getDate() + deltaWeeks * 7);
    this.visitWeekStart = this.getWeekStart(next);
    this.selectedVisitDate = this.toIsoDate(this.visitWeekStart);
  }

  get myDoctorVisits(): Visit[] {
    return this.visits.filter((v) => v.assignedDoctor === 'Dr. Karl John' && v.status === 'Vital Completed');
  }

  get allDoctorVisits(): Visit[] {
    return this.visits;
  }

  get liveWaitingCount(): number {
    return this.myDoctorVisits.length;
  }

  handleLogin(): void {
    this.loggingIn = true;
    setTimeout(() => {
      this.loggedIn = true;
      this.activeTab = 'home';
      this.loggingIn = false;
    }, 800);
  }

  logout(): void {
    this.formOpen = false;
    this.fabMenuOpen = false;
    this.loggedIn = false;
    this.activeTab = 'home';
    this.password = '';
  }

  switchTab(tabId: TabId): void {
    this.activeTab = tabId;
    window.scrollTo(0, 0);
  }

  setDoctorVisitView(view: 'my' | 'all'): void {
    this.doctorVisitView = view;
  }

  openForm(type: 'Adhoc' | 'Routine' = 'Routine'): void {
    if (type === 'Adhoc') {
      this.currentPatient = null;
      this.formPatientName = 'New Adhoc Case';
      this.formDoctorName = 'Dr. Karl John';
      this.formNurseName = 'Julie';
    }
    this.doctorMedicines = '';
    this.doctorNotes = '';
    this.doctorFollowUpDays = null;
    this.selectedLabTests = [];
    this.formOpen = true;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // Sunday = 0
    d.setDate(d.getDate() - day);
    return d;
  }

  private toIsoDate(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private todayIso(): string {
    return this.toIsoDate(new Date());
  }

  toggleFabMenu(): void {
    this.fabMenuOpen = !this.fabMenuOpen;
  }

  openQuickAction(): void {
    this.fabMenuOpen = false;
    this.openForm('Adhoc');
  }

  openPatient(name: string, disease: string, age: string, gender: string, id: string, lastVisit: string, doc: string, nurse: string): void {
    this.currentPatient = { name, disease, age, gender, id, lastVisit, doc, nurse };
    this.formPatientName = name;
    this.formDoctorName = doc || 'Dr. Karl John';
    this.formNurseName = nurse || 'Julie';
    this.openForm('Routine');
  }

  openVisit(visit: Visit): void {
    this.currentVisitId = visit.id;
    this.currentPatient = {
      name: visit.name,
      disease: 'General Checkup',
      age: String(visit.age),
      gender: visit.gender,
      id: visit.id,
      lastVisit: 'Today',
      doc: visit.assignedDoctor,
      nurse: 'Julie'
    };
    this.formPatientName = visit.name;
    this.formDoctorName = visit.assignedDoctor;
    this.formNurseName = 'Julie';
    this.openForm('Routine');
  }

  checkIn(appt: Appointment): void {
    const idx = this.appointments.indexOf(appt);
    if (idx >= 0) {
      this.appointments.splice(idx, 1);
    }
    const visit: Visit = {
      name: appt.name,
      age: appt.age,
      gender: appt.gender,
      id: appt.id,
      status: 'Open',
      mode: 'In-Person',
      assignedDoctor: 'Dr. Karl John',
      createdAt: Date.now(),
      date: this.selectedScheduleDate
    };
    this.visits.push(visit);
    this.currentVisitId = visit.id;
    this.selectedVisitPatient = appt.name;
    this.currentPatient = {
      name: appt.name,
      disease: 'General Checkup',
      age: String(appt.age),
      gender: appt.gender,
      id: appt.id,
      lastVisit: 'Today',
      doc: 'Dr. Karl John',
      nurse: 'Julie'
    };
    this.formPatientName = appt.name;
    this.formDoctorName = 'Dr. Karl John';
    this.formNurseName = 'Julie';
    this.openForm('Routine');
  }

  closeForm(): void {
    this.formOpen = false;
    this.fabMenuOpen = false;
  }

  openPatientDetails(p: Patient): void {
    this.selectedPatient.set(p);
    this.viewMode.set('profile');
  }

  closePatientDetails(): void {
    this.viewMode.set('list');
    this.selectedPatient.set(null);
  }

  openCarePlanByName(name: string, source: 'dashboard' | 'patient-profile'): void {
    const plan = this.carePlans().find((p) => p.name === name) || null;
    this.activePlan.set(plan);
    this.carePlanView.set(plan ? source : 'none');
  }

  closeCarePlan(): void {
    this.carePlanView.set('none');
    this.activePlan.set(null);
  }

  getPatientsInPlan(planId: string): CarePlanMember[] {
    const plan = this.carePlans().find((p) => p.id === planId);
    if (!plan) return [];
    return this.patients()
      .filter((p) => p.carePlan.some((cp) => cp.title === plan.name))
      .map((p) => ({
        id: p.id,
        name: p.name,
        initials: p.initials,
        age: p.age,
        gender: p.gender
      }));
  }

  viewPatientDetail(p: CarePlanMember): void {
    const match = this.patients().find((x) => x.id === p.id);
    if (!match) return;
    this.closeCarePlan();
    this.openPatientDetails(match);
  }

  submitCase(): void {
    this.submitting = true;
    this.encounterSaved = false;

    setTimeout(() => {
      this.submitting = false;
      this.encounterSaved = true;
      if (this.currentVisitId) {
        const visit = this.visits.find((v) => v.id === this.currentVisitId);
        if (visit) {
          visit.status = this.selectedRole === 'doctor' ? 'Closed' : 'Vital Completed';
        }
        this.currentVisitId = null;
      }

      setTimeout(() => {
        this.encounterSaved = false;
        this.closeForm();
        this.switchTab('cases');
      }, 1000);
    }, 1000);
  }
}

