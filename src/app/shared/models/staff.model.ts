//src/app/shared/models/staff.model.ts
import { Address } from './address.model';
export interface Staff {
    staffId: string; // Unique Staff ID
    facilityId: string; // Facility they belong to
    name: string;
    email: string;
    phone: string;
     address: Address;
    role: 'Doctor' | 'Nurse' | 'Admin' | 'Lab Technician' | 'Pharmacist' | 'Radiologist' | 'Paramedic';
    specialization?: Specialization; // Only applicable for doctors & specialists
    registrationNumber?: string; // ZA Health Professional Council Number (for medical roles)
    assignedPatients: string[]; // List of Patient IDs
    status: 'Active' | 'On Leave' | 'Suspended' | 'Resigned';
    profilePictureUrl?: string; // Optional profile image
    createdAt: Date;
    updatedAt: Date;
  }
  
  /**
   * Specialization for Medical Professionals
   */
  export type Specialization =
    | 'General Practitioner'
    | 'Cardiologist'
    | 'Dermatologist'
    | 'Neurologist'
    | 'Orthopedic Surgeon'
    | 'Pediatrician'
    | 'Psychiatrist'
    | 'Oncologist'
    | 'Radiologist'
    | 'Anesthesiologist'
    | 'Gynecologist'
    | 'Ophthalmologist'
    | 'ENT Specialist'
    | 'Urologist'
    | 'Endocrinologist'
    | 'Pulmonologist'
    | 'Emergency Medicine'
    | 'Nephrologist'
    | 'Gastroenterologist'
    | 'Hematologist'
    | 'Infectious Disease Specialist'
    | 'Plastic Surgeon'
    | 'Physical Therapist'
    | 'Pharmacist'
    | 'Nurse Practitioner'
    | 'Other';
  