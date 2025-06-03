//src/app/shared/models/facilityResource.model.ts
export interface FacilityResource {
    id: string;
    facilityId: string;
    resourceType: 'Room' | 'Bed' | 'Equipment';
    name: string;
    status: 'Available' | 'Occupied' | 'Out of Service';
    lastUpdated: Date;
  }
  