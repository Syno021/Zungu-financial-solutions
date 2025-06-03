  // export interface IEquipment {
  //   id: string;
  //   name: string;
  //   type: string;
  //   condition: 'WORKING' | 'NEEDS_REPAIR' | 'OUT_OF_SERVICE';
  //   lastMaintenanceDate: Date;
  //   location: string;
  // }
  
  // export interface IMedicalSupply {
  //   id: string;
  //   name: string;
  //   quantity: number;
  //   unit: string;
  //   expirationDate?: Date;
  // }
  
  // export interface IInventoryControl {
  //   stockItems: IStockItem[];
  // }
  
  // export interface IStockItem {
  //   id: string;
  //   name: string;
  //   category: string;
  //   quantity: number;
  //   reorderLevel: number;
  //   supplier: string;
  //   lastUpdated: Date;
  // }


  // src/app/shared/models/inventory.ts
  import { IBaseModel } from './base';

  export interface IInventoryItem extends IBaseModel {
    barcode: string;
    name: string;
    description: string;
    category: 'MEDICATION' | 'SUPPLY' | 'EQUIPMENT';
    quantity: number;
    reorderLevel: number;
    unit: string;
    unitPrice: number; // In ZAR
    supplier: string;
    lastRestocked: Date;
    expirationDate?: Date;
    location: string;
    minStock: number;
    maxStock: number;
    lastAudit: Date;
    insuranceCoverage: boolean;
    ndcCode?: string; // National Drug Code
    sahpraCode?: string; // SA Health Products Regulatory Authority code
  }
  
  export interface IInventoryMovement extends IBaseModel {
    itemId: string;
    quantity: number;
    movementType: 'RESTOCK' | 'USAGE' | 'ADJUSTMENT' | 'TRANSFER';
    fromLocation?: string;
    toLocation?: string;
    notes: string;
    userId: string; // Staff who performed the movement
  }
  
  export interface IInventoryAlert extends IBaseModel {
    itemId: string;
    alertType: 'LOW_STOCK' | 'EXPIRING' | 'OVERSTOCK';
    message: string;
    resolved: boolean;
  }