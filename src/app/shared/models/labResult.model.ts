//src/app/shared/models/labResult.model.ts
export interface LabResult {
  laborderId: string;
  patientId: string;
  loincCode: string;
  testName: string;
  result: string;
  orderedBy: string;
  issuedAt: Date;
  emailSent: boolean;
  staffId: string; // Added staffId field
}
  