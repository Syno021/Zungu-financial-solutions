export interface InventoryItem {
    id: string;
    facilityId: string;
    name: string;
    category: 'Medication' | 'Equipment' | 'Supplies';
    quantity: number;
    reorderLevel: number;
    lastUpdated: Date;
  }
  