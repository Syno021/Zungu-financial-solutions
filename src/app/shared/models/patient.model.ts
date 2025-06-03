
// src/app/shared/models/patient.model.ts
import { Address } from './address.model';
import { NextOfKin } from './nextOfKin.model';
import { Timestamp } from 'firebase/firestore';

export interface Patient {
  patientId: string;
  facilityId: string;
  name: string;
  email: string;
  saIdNumber?: string;
  dob: Date | Timestamp;  // Update to support both Date and Timestamp
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  address: Address;
  nextOfKin: NextOfKin;
  qrCode: string;
  registeredAt: Date | Timestamp;  // Update to support both Date and Timestamp
}