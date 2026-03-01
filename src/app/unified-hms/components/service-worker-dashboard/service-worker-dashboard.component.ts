import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface VisitItem {
  patient: string;
  condition: string;
  time: string;
  address: string;
  status: 'Active' | 'Scheduled';
}

@Component({
  selector: 'app-service-worker-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-worker-dashboard.component.html',
  styleUrl: './service-worker-dashboard.component.scss'
})
export class ServiceWorkerDashboardComponent {
  visits: VisitItem[] = [
    {
      patient: 'Elena Rodriguez',
      condition: 'Diabetes',
      time: '09:30',
      address: '12 Adams Street',
      status: 'Active'
    },
    {
      patient: 'Samuel Lee',
      condition: 'Cardiac',
      time: '11:00',
      address: '78 North Avenue',
      status: 'Scheduled'
    }
  ];

  get visitsTodayCount(): number {
    return this.visits.filter((visit) => visit.status !== 'Scheduled').length;
  }
}
