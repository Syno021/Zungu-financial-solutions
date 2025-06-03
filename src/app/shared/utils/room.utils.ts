// src/app/shared/utils/room.utils.ts


import { RoomType, IRoomAllocationDetail, TimeSlot, BedAllocation, SeatAllocation } from '../../shared/models/room.types';

export const roomTypeFeatures: Record<RoomType, {
  suggestedFeatures: string[],
  defaultMinimumStay: number
}> = {
  GENERAL_WARD: {
    suggestedFeatures: ['Basic amenities', 'Curtain dividers'],
    defaultMinimumStay: 24
  },
  SEMI_PRIVATE: {
    suggestedFeatures: ['Shared bathroom', 'TV'],
    defaultMinimumStay: 24
  },
  PRIVATE: {
    suggestedFeatures: ['Private bathroom', 'TV', 'WiFi'],
    defaultMinimumStay: 24
  },
  SUITE: {
    suggestedFeatures: ['Living area', 'Kitchenette', 'Private bathroom', 'Premium amenities'],
    defaultMinimumStay: 24
  },
  ICU: {
    suggestedFeatures: ['Advanced monitoring', 'Life support equipment'],
    defaultMinimumStay: 12
  },
  MATERNITY: {
    suggestedFeatures: ['Labor equipment', 'Baby care station'],
    defaultMinimumStay: 48
  },
  PEDIATRIC: {
    suggestedFeatures: ['Child-friendly décor', 'Play area'],
    defaultMinimumStay: 24
  },
  ISOLATION: {
    suggestedFeatures: ['Negative pressure system', 'Anteroom'],
    defaultMinimumStay: 24
  }
};

export function initializeRoomAllocation(room: IRoomAllocationDetail): IRoomAllocationDetail {
  const bedAllocation = Array.from({ length: room.totalBeds }, (_, index) => ({
    bedNumber: index + 1,
    timeSlots: []
  }));

  const seatAllocation = Array.from({ length: room.totalSeats }, (_, index) => ({
    seatNumber: index + 1,
    timeSlots: []
  }));

  const suggestedFeatures = roomTypeFeatures[room.roomType].suggestedFeatures;
  const defaultMinimumStay = roomTypeFeatures[room.roomType].defaultMinimumStay;

  return {
    ...room,
    bedAllocation,
    seatAllocation,
    features: room.features || suggestedFeatures,
    minimumStayHours: room.minimumStayHours || defaultMinimumStay,
    status: 'EMPTY'
  };
}

export function calculateRoomStatus(room: IRoomAllocationDetail): 'EMPTY' | 'LESS THAN HALF' | 'HALF FULL' | 'ALMOST FULL' | 'FULL' {
  const { occupiedBeds, totalBeds, occupiedSeats, totalSeats } = getOccupancyDetails(room);
  
  const totalCapacity = totalBeds + totalSeats;
  const totalOccupied = occupiedBeds + occupiedSeats;
  
  if (totalCapacity === 0) return 'EMPTY';
  
  const occupancyRate = (totalOccupied / totalCapacity) * 100;
  
  if (occupancyRate === 0) return 'EMPTY';
  if (occupancyRate >= 100) return 'FULL';
  if (occupancyRate > 75) return 'ALMOST FULL';
  if (occupancyRate >= 50) return 'HALF FULL';
  return 'LESS THAN HALF';
}



export function calculateUpdatedRoomStatus(room: IRoomAllocationDetail): 'EMPTY' | 'LESS THAN HALF' | 'HALF FULL' | 'ALMOST FULL' | 'FULL' {
  const { occupiedBeds, totalBeds, occupiedSeats, totalSeats } = getOccupancyDetails(room);
  
  // Handle single patient rooms first
  if (room.singlePatientRoom) {
    return (occupiedBeds + occupiedSeats) > 0 ? 'FULL' : 'EMPTY';
  }

  const totalCapacity = totalBeds + totalSeats;
  if (totalCapacity === 0) return 'EMPTY';

  const totalOccupied = occupiedBeds + occupiedSeats;
  const occupancyRate = (totalOccupied / totalCapacity) * 100;

  // More precise status calculation
  if (occupancyRate === 0) return 'EMPTY';
  if (occupancyRate === 100) return 'FULL';
  if (occupancyRate === 50) return 'HALF FULL';
  if (occupancyRate < 50) return 'LESS THAN HALF';
  return 'ALMOST FULL';
}



export function isTimeSlotActive(slot: TimeSlot): boolean {
  const now = new Date();
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  return slot.patientId != null && startTime <= now && endTime >= now;
}



export function isAllocationActive(allocation: BedAllocation | SeatAllocation): boolean {
  if (!allocation.patientId) return false;
  const now = new Date();
  return new Date(allocation.startTime!) <= now && new Date(allocation.endTime!) >= now;
}

export function getOccupancyDetails(room: IRoomAllocationDetail) {
  const now = new Date();
  
  // Handle undefined room or arrays
  if (!room || !room.bedAllocation) {
    return {
      occupiedBeds: 0,
      totalBeds: room?.totalBeds || 0,
      occupiedSeats: 0,
      totalSeats: room?.totalSeats || 0
    };
  }
  
  const occupiedBeds = room.bedAllocation?.filter(bed => 
    bed.patientId && bed.endTime && new Date(bed.endTime) >= now
  ).length || 0;

  const occupiedSeats = room.seatAllocation?.filter(seat => 
    seat.patientId && seat.endTime && new Date(seat.endTime) >= now
  ).length || 0;

  return {
    occupiedBeds,
    totalBeds: room.totalBeds || 0,
    occupiedSeats,
    totalSeats: room.totalSeats || 0
  };
}


export function checkTimeSlotOverlap(
  startTime: Date,
  endTime: Date,
  existingSlots: TimeSlot[]
): boolean {
  return existingSlots.some(slot => {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    return (
      (startTime >= slotStart && startTime < slotEnd) ||
      (endTime > slotStart && endTime <= slotEnd) ||
      (startTime <= slotStart && endTime >= slotEnd)
    );
  });
}