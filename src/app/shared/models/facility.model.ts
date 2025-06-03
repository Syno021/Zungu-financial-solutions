//src/app/shared/models/facility.model.ts
import { Address } from './address.model';
import firebase from 'firebase/compat/app';
export interface Facility {
    facilityId: string;
    name: string;
    type: 'Hospital' | 'Clinic' | 'Private Practice';
    registrationNumber: string; 
    location: Address;
    contactEmail: string;
    contactPhone: string;
    registeredAt: Date | firebase.firestore.Timestamp;
    
  }
  