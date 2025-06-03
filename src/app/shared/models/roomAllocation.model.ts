//src/app/shared/models/roomAllocation.model.ts
export interface RoomAllocation {
    id: string;
    facilityId: string;
    roomId: string; // Reference to FacilityResource (Room)
    patientId: string;
    allocatedBy: string; // Staff ID
    status: 'Active' | 'Discharged';
    startDate: Date;
    endDate?: Date; // If discharged
  }
  