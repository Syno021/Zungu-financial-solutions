

// src/app/shared/utils/customeId.util.ts
export class CustomIdUtil {
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
    
  private static getShortTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString(36); // Shortened base36 timestamp
  }
    
  static generateStaffId(): string {
    return `STF-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }
    
  static generatePatientId(): string {
    return `PAT-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }
    
  static generateFacilityId(): string {
    return `FAC-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  // New ID generation methods for your models
  
  static generatePrescriptionId(): string {
    return `PRX-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateRadiologyId(): string {
    return `RAD-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateLabOrderId(): string {
    return `LAB-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateInventoryId(): string {
    return `INV-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateEhrId(): string {
    return `EHR-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateRoomId(): string {
    return `RM-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateRoomAllocationId(): string {
    return `ALLOC-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateDoctorId(): string {
    return `DOC-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateMedicationId(): string {
    return `MED-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateNextOfKinId(): string {
    return `NOK-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateAppointmentId(): string {
    return `APT-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateBillingId(): string {
    return `BIL-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  static generateInsuranceId(): string {
    return `INS-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }

  // Generic ID generator for custom entity types
  static generateCustomId(prefix: string): string {
    return `${prefix}-${this.getShortTimestamp()}-${this.generateRandomString(3)}`;
  }
}
  