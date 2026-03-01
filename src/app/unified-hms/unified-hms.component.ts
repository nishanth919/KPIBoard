import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DoctorDashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';
import { ServiceWorkerDashboardComponent } from './components/service-worker-dashboard/service-worker-dashboard.component';
import { UnifiedRole } from './unified-hms.types';

@Component({
  selector: 'app-unified-hms',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorDashboardComponent, ServiceWorkerDashboardComponent],
  templateUrl: './unified-hms.component.html',
  styleUrl: './unified-hms.component.scss'
})
export class UnifiedHmsComponent {
  roles: UnifiedRole[] = [
    'Doctor',
    'Nurse',
    'Lab Technician',
    'Service Worker',
    'Pharmacist',
    'Patient'
  ];

  selectedRole: UnifiedRole = 'Doctor';
  staffId = '';
  password = '';
  loggedIn = false;

  login(): void {
    this.loggedIn = true;
  }

  logout(): void {
    this.loggedIn = false;
    this.password = '';
  }

  isDoctorRole(): boolean {
    return this.selectedRole === 'Doctor' || this.selectedRole === 'Nurse';
  }
}
