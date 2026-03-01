import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PatientRecord } from '../../unified-hms.types';

@Component({
  selector: 'app-module-patient-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './module-patient-registration.component.html',
  styleUrl: './module-patient-registration.component.scss'
})
export class ModulePatientRegistrationComponent implements OnChanges {
  @Input({ required: true }) patients: PatientRecord[] = [];
  @Input() selectedPatientId: string | null = null;
  @Output() selectedPatientIdChange = new EventEmitter<string | null>();
  @Output() patientSaved = new EventEmitter<PatientRecord>();

  readonly chronicOptions: string[] = [
    'Hypertension',
    'Diabetes',
    'Asthma',
    'Cardiac',
    'CKD',
    'COPD'
  ];

  draft: PatientRecord = this.emptyPatient();
  allergyInput = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patients'] || changes['selectedPatientId']) {
      this.syncDraftFromSelection();
    }
  }

  selectPatient(patientId: string): void {
    this.selectedPatientId = patientId;
    this.selectedPatientIdChange.emit(patientId);
    this.syncDraftFromSelection();
  }

  startNewPatient(): void {
    const uid = `UHMS-${Date.now().toString().slice(-6)}`;
    this.selectedPatientId = null;
    this.selectedPatientIdChange.emit(null);
    this.draft = this.emptyPatient(uid);
    this.allergyInput = '';
  }

  savePatient(): void {
    const clean = {
      ...this.draft,
      fullName: this.draft.fullName.trim(),
      phone: this.draft.phone.trim(),
      email: this.draft.email.trim(),
      address: this.draft.address.trim(),
      emergencyContact: this.draft.emergencyContact.trim(),
      medicalHistory: this.draft.medicalHistory.trim()
    };
    this.patientSaved.emit(clean);
    this.selectedPatientId = clean.id;
    this.selectedPatientIdChange.emit(clean.id);
  }

  addAllergy(): void {
    const value = this.allergyInput.trim();
    if (!value) return;
    if (!this.draft.allergies.includes(value)) {
      this.draft = { ...this.draft, allergies: [...this.draft.allergies, value] };
    }
    this.allergyInput = '';
  }

  removeAllergy(allergy: string): void {
    this.draft = { ...this.draft, allergies: this.draft.allergies.filter((a) => a !== allergy) };
  }

  toggleChronic(condition: string, checked: boolean): void {
    const current = this.draft.chronicConditions;
    const next = checked
      ? [...new Set([...current, condition])]
      : current.filter((item) => item !== condition);
    this.draft = { ...this.draft, chronicConditions: next };
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    const names = Array.from(files).map((file) => file.name);
    this.draft = { ...this.draft, documents: [...this.draft.documents, ...names] };
    input.value = '';
  }

  removeDocument(name: string): void {
    this.draft = { ...this.draft, documents: this.draft.documents.filter((doc) => doc !== name) };
  }

  isConditionChecked(condition: string): boolean {
    return this.draft.chronicConditions.includes(condition);
  }

  private syncDraftFromSelection(): void {
    if (!this.selectedPatientId) return;
    const patient = this.patients.find((item) => item.id === this.selectedPatientId);
    if (!patient) return;
    this.draft = {
      ...patient,
      allergies: [...patient.allergies],
      chronicConditions: [...patient.chronicConditions],
      documents: [...patient.documents]
    };
    this.allergyInput = '';
  }

  private emptyPatient(id = ''): PatientRecord {
    return {
      id,
      fullName: '',
      dob: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',
      medicalHistory: '',
      allergies: [],
      chronicConditions: [],
      consentTreatment: false,
      consentRemoteCare: false,
      consentDataUse: false,
      documents: []
    };
  }
}
