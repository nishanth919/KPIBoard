import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppointmentSlot, PatientRecord, QueueEntry, QueueType } from '../../unified-hms.types';

@Component({
  selector: 'app-module-appointment-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './module-appointment-queue.component.html',
  styleUrl: './module-appointment-queue.component.scss'
})
export class ModuleAppointmentQueueComponent {
  @Input() patients: PatientRecord[] = [];

  newSlot: Omit<AppointmentSlot, 'id'> = {
    doctorName: 'Dr. Sarah Jenkins',
    location: 'Main Clinic',
    date: this.today(),
    startTime: '09:00',
    durationMinutes: 15,
    teleconsult: false,
    overbookingAllowed: false
  };

  slots: AppointmentSlot[] = [
    {
      id: 'slot-1',
      doctorName: 'Dr. Sarah Jenkins',
      location: 'Main Clinic',
      date: this.today(),
      startTime: '09:00',
      durationMinutes: 15,
      teleconsult: false,
      overbookingAllowed: true
    },
    {
      id: 'slot-2',
      doctorName: 'Dr. Sarah Jenkins',
      location: 'Virtual',
      date: this.today(),
      startTime: '09:30',
      durationMinutes: 20,
      teleconsult: true,
      overbookingAllowed: false
    }
  ];

  queue: QueueEntry[] = [
    {
      id: 'q-1',
      token: 'AP-001',
      patientId: 'UHMS-102001',
      patientName: 'Elena Rodriguez',
      queueType: 'Appointment',
      status: 'Waiting',
      emergencyFlag: false,
      noShowCount: 0
    },
    {
      id: 'q-2',
      token: 'EM-001',
      patientName: 'Walk-in Emergency',
      queueType: 'Emergency',
      status: 'Waiting',
      emergencyFlag: true,
      noShowCount: 1
    }
  ];

  selectedPatientId = '';
  selectedQueueType: QueueType = 'Appointment';
  cancellationDoctor = 'Dr. Sarah Jenkins';
  cancellationReason = '';
  notificationLog: string[] = [];

  addSlot(): void {
    this.slots = [{ id: `slot-${Date.now()}`, ...this.newSlot }, ...this.slots];
  }

  addToQueue(): void {
    const patient = this.patients.find((item) => item.id === this.selectedPatientId);
    const patientName = patient?.fullName || 'Unknown Patient';
    const token = this.generateToken(this.selectedQueueType);
    this.queue = [
      ...this.queue,
      {
        id: `q-${Date.now()}`,
        token,
        patientId: patient?.id,
        patientName,
        queueType: this.selectedQueueType,
        status: 'Waiting',
        emergencyFlag: this.selectedQueueType === 'Emergency',
        noShowCount: 0
      }
    ];
  }

  markInProgress(entryId: string): void {
    this.updateEntry(entryId, { status: 'In Progress' });
  }

  markDone(entryId: string): void {
    this.updateEntry(entryId, { status: 'Done' });
  }

  markNoShow(entryId: string): void {
    const entry = this.queue.find((item) => item.id === entryId);
    if (!entry) return;
    this.updateEntry(entryId, { status: 'No-Show', noShowCount: entry.noShowCount + 1 });
  }

  flagEmergency(entryId: string): void {
    this.queue = this.queue.map((entry) =>
      entry.id === entryId ? { ...entry, emergencyFlag: true, queueType: 'Emergency' } : entry
    );
    this.queue = [
      ...this.queue.filter((entry) => entry.id === entryId),
      ...this.queue.filter((entry) => entry.id !== entryId)
    ];
    this.notificationLog = [
      `Emergency override: ${entryId} pushed to top. Alert sent to doctor + nurse.`,
      ...this.notificationLog
    ];
  }

  autoReschedule(): void {
    const waitingAppointments = this.queue.filter(
      (entry) => entry.queueType === 'Appointment' && entry.status === 'Waiting'
    );
    if (!waitingAppointments.length) return;

    const slot = this.nextAvailableSlot();
    waitingAppointments.forEach((entry) => {
      this.notificationLog = [
        `Rescheduled ${entry.patientName} to ${slot.date} ${slot.startTime} (${this.cancellationDoctor})`,
        ...this.notificationLog
      ];
    });
  }

  repeatOffender(entry: QueueEntry): boolean {
    return entry.noShowCount >= 2;
  }

  queueByType(type: QueueType): QueueEntry[] {
    return this.queue.filter((entry) => entry.queueType === type);
  }

  private updateEntry(entryId: string, patch: Partial<QueueEntry>): void {
    this.queue = this.queue.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry));
  }

  private generateToken(type: QueueType): string {
    const prefixMap: Record<QueueType, string> = {
      'Walk-in': 'WI',
      Appointment: 'AP',
      Emergency: 'EM'
    };
    const prefix = prefixMap[type];
    const count = this.queue.filter((entry) => entry.token.startsWith(prefix)).length + 1;
    return `${prefix}-${String(count).padStart(3, '0')}`;
  }

  private nextAvailableSlot(): AppointmentSlot {
    const sorted = [...this.slots].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    return sorted[0] ?? {
      id: 'tmp',
      doctorName: this.cancellationDoctor,
      location: 'Main Clinic',
      date: this.today(),
      startTime: '10:00',
      durationMinutes: 15,
      teleconsult: false,
      overbookingAllowed: false
    };
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}
