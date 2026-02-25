import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * CareConnect Mobile - Refined Style & Layout Architecture
 * Optimized for mobile viewports with corrected CSS specificity.
 */

type UserRole = 'Doctor' | 'Staff' | 'Patient' | 'Admin' | 'Pharmacist';

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  time: string;
  type: 'In-Person' | 'Online';
  status: 'Scheduled' | 'Waiting' | 'Completed' | 'Request';
}

@Component({
  selector: 'glb-hms-root',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './glb-hms.html',
  styleUrls: ['./glb-hms.scss']
})
export class GlbHmsComponent {
  // State Signals
  role = signal<UserRole>('Doctor');
  isAuthenticated = signal(false);
  userName = signal('Dr. Sarah Miller');
  activeTab = signal('home');
  isVideoActive = signal(false);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  reqType = signal('Online');

  selectedPatient = signal<Appointment | null>(null);

  // Mock Data
  timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'];

  appointments: Appointment[] = [
    { id: '1', patientName: 'Jane Smith', doctorName: 'Dr. Sarah Miller', time: '09:00 AM', type: 'Online', status: 'Scheduled' },
    { id: '2', patientName: 'Robert Fox', doctorName: 'Dr. Sarah Miller', time: '10:30 AM', type: 'In-Person', status: 'Waiting' },
    { id: '3', patientName: 'Emily Chen', doctorName: 'Dr. Sarah Miller', time: '12:00 PM', type: 'Online', status: 'Scheduled' }
  ];

  waitingList = signal([
    { id: '101', patientName: 'Mark Johnson', time: '12m' },
    { id: '102', patientName: 'Linda Bell', time: '28m' }
  ]);

  userInitials = computed(() => {
    const parts = this.userName().split(' ');
    return parts.length > 1 ? parts[parts.length - 1].substring(0, 2).toUpperCase() : 'CC';
  });

  setRole(event: any) {
    this.role.set(event.target.value);
    this.selectedPatient.set(null);
    if (this.role() === 'Patient') this.userName.set('Jane Smith');
    else if (this.role() === 'Staff') this.userName.set('Nurse Jessica');
    else this.userName.set('Dr. Sarah Miller');
  }

  login(id: string) {
    this.isAuthenticated.set(true);
  }

  logout() {
    this.isAuthenticated.set(false);
    this.selectedPatient.set(null);
  }

  selectPatient(id: string) {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) this.selectedPatient.set(appt);
  }

  getApptForSlot(time: string) {
    return this.appointments.find(a => a.time === time);
  }

  toggleVideo(state: boolean) {
    this.isVideoActive.set(state);
  }
}