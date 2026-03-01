import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { PatientRecord } from '../../unified-hms.types';
import { ModuleAppointmentQueueComponent } from '../module-appointment-queue/module-appointment-queue.component';
import { ModulePatientRegistrationComponent } from '../module-patient-registration/module-patient-registration.component';

type MainTab = 'dashboard' | 'patients' | 'schedule' | 'reports' | 'settings';
type QueueTab = 'Waiting' | 'Teleconsult' | 'Follow-up' | 'Emergency';

interface CriticalAlertItem {
  id: string;
  title: string;
  patientName: string;
}

interface SummaryCard {
  id: string;
  icon: string;
  label: string;
  value: number;
}

interface QueuePatient {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  condition: string;
  category: QueueTab;
  bp: string;
  sugar: number;
  emergencyFlag: boolean;
}

interface HighRiskPatient {
  id: string;
  name: string;
  carePlan: string;
  lastVisit: string;
  riskScore: number;
}

interface CareProgram {
  id: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, ModulePatientRegistrationComponent, ModuleAppointmentQueueComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss'
})
export class DoctorDashboardComponent {
  readonly queueTabs: QueueTab[] = ['Waiting', 'Teleconsult', 'Follow-up', 'Emergency'];
  readonly todayLabel = 'Monday, Feb 24';
  readonly clinicLocation = 'Main Clinic, Chennai';

  activeMainTab: MainTab = 'dashboard';
  activeQueueTab: QueueTab = 'Waiting';
  selectedPatientId: string | null = 'UHMS-102001';
  showFabMenu = false;
  expandedQueueId: string | null = null;

  patients: PatientRecord[] = [
    {
      id: 'UHMS-102001',
      fullName: 'Elena Rodriguez',
      dob: '1988-03-10',
      gender: 'Female',
      phone: '+1 312 555 1100',
      email: 'elena.r@example.com',
      address: '12 Adams Street, Chicago',
      emergencyContact: 'Luis Rodriguez +1 312 555 1101',
      medicalHistory: 'Type 2 diabetes and hypertension.',
      allergies: ['Penicillin'],
      chronicConditions: ['Diabetes', 'Hypertension'],
      consentTreatment: true,
      consentRemoteCare: true,
      consentDataUse: true,
      documents: ['cbc-report.pdf']
    },
    {
      id: 'UHMS-102002',
      fullName: 'Samuel Lee',
      dob: '1972-07-22',
      gender: 'Male',
      phone: '+1 312 555 2200',
      email: 'samuel.lee@example.com',
      address: '78 North Avenue, Chicago',
      emergencyContact: 'Dana Lee +1 312 555 2201',
      medicalHistory: 'Cardiac follow-up.',
      allergies: [],
      chronicConditions: ['Cardiac'],
      consentTreatment: true,
      consentRemoteCare: false,
      consentDataUse: true,
      documents: []
    },
    {
      id: 'UHMS-102003',
      fullName: 'Robert Chen',
      dob: '1969-12-05',
      gender: 'Male',
      phone: '+1 312 555 3300',
      email: 'robert.chen@example.com',
      address: '55 Lake Shore Drive, Chicago',
      emergencyContact: 'Amy Chen +1 312 555 3301',
      medicalHistory: 'Hypertension follow-up.',
      allergies: ['Sulfa'],
      chronicConditions: ['Hypertension'],
      consentTreatment: true,
      consentRemoteCare: true,
      consentDataUse: true,
      documents: ['echo-2025.pdf']
    }
  ];

  criticalAlerts: CriticalAlertItem[] = [
    { id: 'a-1', title: 'BP Spike', patientName: 'Rajesh' },
    { id: 'a-2', title: 'Emergency Escalation', patientName: 'Anita' }
  ];

  summaryCards: SummaryCard[] = [
    { id: 's1', icon: '🧑', label: 'Patients Today', value: 18 },
    { id: 's2', icon: '📹', label: 'Teleconsults', value: 6 },
    { id: 's3', icon: '🧪', label: 'Pending Labs', value: 4 },
    { id: 's4', icon: '🌿', label: 'Active Care Patients', value: 23 }
  ];

  queuePatients: QueuePatient[] = [
    {
      id: 'q-1',
      patientId: 'UHMS-102001',
      patientName: 'Elena Rodriguez',
      age: 46,
      condition: 'Hypertension',
      category: 'Waiting',
      bp: '150/95',
      sugar: 180,
      emergencyFlag: false
    },
    {
      id: 'q-2',
      patientId: 'UHMS-102002',
      patientName: 'Samuel Lee',
      age: 52,
      condition: 'Diabetes',
      category: 'Follow-up',
      bp: '132/86',
      sugar: 156,
      emergencyFlag: false
    },
    {
      id: 'q-3',
      patientId: 'UHMS-102003',
      patientName: 'Robert Chen',
      age: 68,
      condition: 'Acute BP Spike',
      category: 'Emergency',
      bp: '182/110',
      sugar: 178,
      emergencyFlag: true
    },
    {
      id: 'q-4',
      patientId: 'UHMS-102002',
      patientName: 'Anita Sharma',
      age: 39,
      condition: 'Maternity Check',
      category: 'Teleconsult',
      bp: '126/82',
      sugar: 128,
      emergencyFlag: false
    }
  ];

  highRiskPatients: HighRiskPatient[] = [
    { id: 'hr-1', name: 'Anita', carePlan: 'Hypertension', lastVisit: '2 days ago', riskScore: 78 },
    { id: 'hr-2', name: 'Rajesh', carePlan: 'Cardio + Diabetes', lastVisit: '1 day ago', riskScore: 72 }
  ];

  carePrograms: CareProgram[] = [
    { id: 'c1', name: 'Hypertension', count: 12 },
    { id: 'c2', name: 'Diabetes', count: 8 },
    { id: 'c3', name: 'Maternity', count: 3 }
  ];

  get filteredQueuePatients(): QueuePatient[] {
    return this.queuePatients.filter((patient) => patient.category === this.activeQueueTab);
  }

  get totalPrograms(): number {
    return this.carePrograms.reduce((sum, item) => sum + item.count, 0);
  }

  get initials(): string {
    return 'DS';
  }

  get pendingAlertCount(): number {
    return this.criticalAlerts.length + 1;
  }

  setMainTab(tab: MainTab): void {
    this.activeMainTab = tab;
    this.showFabMenu = false;
  }

  setQueueTab(tab: QueueTab): void {
    this.activeQueueTab = tab;
    this.expandedQueueId = null;
  }

  queueTabCount(tab: QueueTab): number {
    return this.queuePatients.filter((patient) => patient.category === tab).length;
  }

  toggleQueueActions(itemId: string): void {
    this.expandedQueueId = this.expandedQueueId === itemId ? null : itemId;
  }

  isQueueActionsOpen(itemId: string): boolean {
    return this.expandedQueueId === itemId;
  }

  openQueueDetails(item: QueuePatient): void {
    this.selectedPatientId = item.patientId;
    this.activeMainTab = 'patients';
  }

  toggleFabMenu(): void {
    this.showFabMenu = !this.showFabMenu;
  }

  quickAction(action: 'consult' | 'walkin' | 'tele' | 'care'): void {
    if (action === 'consult') this.activeMainTab = 'schedule';
    if (action === 'walkin') {
      this.activeMainTab = 'dashboard';
      this.activeQueueTab = 'Waiting';
    }
    if (action === 'tele') {
      this.activeMainTab = 'dashboard';
      this.activeQueueTab = 'Teleconsult';
    }
    if (action === 'care') this.activeMainTab = 'patients';
    this.showFabMenu = false;
  }

  isHighBp(bpValue: string): boolean {
    const [systolic] = bpValue.split('/').map((v) => Number(v));
    return Number.isFinite(systolic) && systolic >= 140;
  }

  isHighSugar(sugar: number): boolean {
    return sugar >= 170;
  }

  riskBarWidth(score: number): string {
    return `${Math.max(0, Math.min(100, score))}%`;
  }

  careProgramBarWidth(count: number): string {
    if (!this.totalPrograms) return '0%';
    return `${(count / this.totalPrograms) * 100}%`;
  }

  openCriticalAlerts(): void {
    this.activeQueueTab = 'Emergency';
  }

  dismissAlerts(): void {
    this.criticalAlerts = [];
  }

  onPatientSaved(patient: PatientRecord): void {
    const index = this.patients.findIndex((item) => item.id === patient.id);
    if (index >= 0) {
      this.patients = this.patients.map((item) => (item.id === patient.id ? patient : item));
    } else {
      this.patients = [patient, ...this.patients];
    }
    this.selectedPatientId = patient.id;
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
}
