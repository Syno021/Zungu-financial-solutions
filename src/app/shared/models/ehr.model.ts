//src/app/shared/models/ehr.model.ts
import { MedicalHistory } from './medicalHistory.model';
import { Prescription } from './prescription.model';
import { LabResult } from './labResult.model';  
import { RadiologyResult } from './radiologyResult.model';  
import { Address } from './address.model';
import { NextOfKin } from './nextOfKin.model';


export interface EHR {
    id: string;
    patientId: string;
    surname: string;
    facilityId: string;
    name: string;
    email: string;
    saIdNumber?: string;
    dob: Date;
    gender: 'Male' | 'Female' | 'Other';
    contactNumber: string;
    address: Address;
    nextOfKin: NextOfKin;
    icd10DiagnosisCodes: string[];
    snomedCodes: string[];
    medicalHistory: MedicalHistory;  // This is required in the type but handled with default values
    prescriptions: Prescription[]; // This is required in the type but handled with default values
    labResults: string[];  // Array of laborderId values
    radiologyResults: string[];  // Array of radiologyId values
    lastUpdated: Date;
}

// A partial interface for creating new EHRs with optional fields
export interface CreateEhrDto extends Omit<Partial<EHR>, 'medicalHistory' | 'prescriptions'> {
    medicalHistory?: MedicalHistory;
    prescriptions?: Prescription | Prescription[]; // Allow both for backward compatibility
}
