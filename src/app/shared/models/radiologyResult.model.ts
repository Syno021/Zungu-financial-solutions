//src/app/shared/models/radiologyResult.model.ts

export interface RadiologyResult {
  radiologyId: string;
  patientId: string;
  scanType: string;
  findings: string;
  orderedBy: string;
  issuedAt: Date;
  emailSent: boolean;
  staffId: string; // Added staffId field
}
  
  