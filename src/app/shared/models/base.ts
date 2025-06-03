// Core Interfaces
export interface IBaseModel {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    facilityId: string[];
  }