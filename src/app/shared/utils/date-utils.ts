// src/app/shared/utils/date-utils.ts
/**
 * Utility functions to handle Firestore Timestamp objects
 */

export class DateUtils {
    /**
     * Converts a Firestore Timestamp to a JavaScript Date object
     * @param timestamp The Firestore Timestamp object or Date object
     * @returns A JavaScript Date object
     */
    static toDate(timestamp: any): Date | null {
      if (!timestamp) {
        return null;
      }
      
      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp;
      }
      
      // If it's a Firestore Timestamp object
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      
      // If it's a timestamp number
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      
      // If it's an object with seconds and nanoseconds (Firestore Timestamp format)
      if (timestamp && timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      }
      
      // If it's a string, try to parse it
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      
      return null;
    }
    
    /**
     * Recursively converts all Timestamp objects in an object to Date objects
     * @param obj The object containing Timestamp values
     * @returns The same object structure with all Timestamps converted to Dates
     */
    static convertTimestamps<T>(obj: T): T {
      if (!obj) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => this.convertTimestamps(item)) as unknown as T;
      }
      
      if (typeof obj === 'object') {
        const result = { ...obj } as Record<string, any>;
        
        Object.keys(result).forEach(key => {
          const value = result[key];
          
          // Convert Timestamp to Date
          if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            result[key] = value.toDate();
          } 
          // Convert Timestamp-like object to Date
          else if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
            result[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
          }
          // Recursively process nested objects or arrays
          else if (value && typeof value === 'object') {
            result[key] = this.convertTimestamps(value);
          }
        });
        
        return result as T;
      }
      
      return obj;
    }
  }