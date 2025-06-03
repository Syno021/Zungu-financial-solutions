//src/app/shared/models/prescription.model.ts
export interface Prescription {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  facilityId: string;
  medication: string;
  dosage: string;
  duration: string;
  issuedAt: Date;
  staffId: string; // Added staffId field
}
  