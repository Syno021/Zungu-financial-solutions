// src/app/shared/models/room.types.ts

export type RoomType = 
  | 'GENERAL_WARD'
  | 'SEMI_PRIVATE'
  | 'PRIVATE'
  | 'SUITE'
  | 'ICU'
  | 'MATERNITY'
  | 'PEDIATRIC'
  | 'ISOLATION';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  patientId?: string;
}

export interface BedAllocation {
  bedNumber: number;
  patientId?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface SeatAllocation {
  seatNumber: number;
  patientId?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface AllocationInput {
    patientId: string;
    duration: number | null;
  }
  
  export interface IRoomAllocationDetail {
    roomId: string;
    roomNumber: string;
    roomType: RoomType;
    location: string;
    totalBeds: number;
    totalSeats: number;
    singlePatientRoom: boolean;
    bedAllocation?: BedAllocation[];
    seatAllocation?: SeatAllocation[];
    assignedStaff: string[];
    status: 'EMPTY' | 'LESS THAN HALF' | 'HALF FULL' | 'ALMOST FULL' | 'FULL';
    hourlyRate?: number;
    minimumStayHours?: number;
    features?: string[];
    // Add the new properties
    allocationInput: AllocationInput;
    assignedStaffInput: string;
  }