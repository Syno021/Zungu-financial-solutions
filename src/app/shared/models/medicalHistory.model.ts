// medicalHistory.model.ts

export interface MedicalHistory {
    id: string;
    patientId: string;
    facilityId: string;
    
    // Clinical data
    conditions: MedicalCondition[];
    surgeries: Surgery[];
    allergies: Allergy[];
    immunizations: Immunization[];
    familyHistory: FamilyHistoryItem[];
    
    // Document metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string; // Staff ID
    lastUpdatedBy: string; // Staff ID
  }
  
  export interface MedicalCondition {
    
    icd10Code: string;
    snomedCode: string;
    name: string;
    diagnosedDate: Date; // Use Date type here
    status: 'Active' | 'Resolved' | 'Recurring';
    notes: string;
    treatingPhysician: string; // Staff ID
  }
  
  export interface Surgery {
    cptCode: string;
    procedureName: string;
    performedDate: Date;
    surgeon: string; // Staff ID or name
    facility: string; // Could be external facility
    notes: string;
    complications: string;
  }
  
  export interface Allergy {
    allergen: string;
    snomedCode: string; // SNOMED CT code for the allergen
    reactionType: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';
    diagnosedDate: Date;
    notes: string;
  }
  
  export interface Immunization {
    cptCode: string;
    vaccineName: string;
    administeredDate: Date;
    administeredBy: string; // Staff ID
    lotNumber: string;
    expirationDate: Date;
    site: 'Left Arm' | 'Right Arm' | 'Left Thigh' | 'Right Thigh' | 'Other';
    notes: string;
  }
  
  export interface FamilyHistoryItem {
    condition: string;
    icd10Code: string;
    relationship: 'Parent' | 'Sibling' | 'Child' | 'Grandparent' | 'Other';
    notes: string;
  }