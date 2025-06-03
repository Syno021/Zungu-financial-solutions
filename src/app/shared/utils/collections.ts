// collections.ts

/**
 * Constant collections for healthcare system
 * Simple initialization of collection names for use throughout the application
 */

// Initialize empty collections
export const prescriptions: Map<string, any> = new Map<string, any>();
export const labTests: Map<string, any> = new Map<string, any>();
export const radiologies: Map<string, any> = new Map<string, any>();
export const appointments: Map<string, any> = new Map<string, any>();
export const staff: Map<string, any> = new Map<string, any>();
export const rooms: Map<string, any> = new Map<string, any>();
export const patients: Map<string, any> = new Map<string, any>();
export const inventoryMovements: Map<string, any> = new Map<string, any>();
export const inventoryAlerts: Map<string, any> = new Map<string, any>();
export const inventory: Map<string, any> = new Map<string, any>();
export const facilities: Map<string, any> = new Map<string, any>();
export const ehrs: Map<string, any> = new Map<string, any>();

// Export all collections as a convenience object
export const collections = {
  prescriptions,
  labTests,
  radiologies,
  appointments,
  staff,
  rooms,
  patients,
  inventoryMovements,
  inventoryAlerts,
  inventory,
  facilities,
  ehrs
};