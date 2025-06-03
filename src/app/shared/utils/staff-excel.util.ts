import * as XLSX from 'xlsx';
import { Staff, Specialization } from '../../shared/models/staff.model';
import { Address } from '../../shared/models/address.model';

/**
 * Utilities for Excel-based staff registration
 */
export class StaffExcelUtils {
  
  /**
   * Generate an Excel template for staff batch registration
   * @param facilityId The ID of the facility these staff will belong to
   * @returns Blob containing the Excel file
   */
  static generateStaffTemplate(facilityId: string): Blob {
    // Create template headers
    const headers = [
      'Name*', 'Email*', 'Phone*', 
      'Street*', 'City*', 'Province*', 'Postal Code*', 'Country*',
      'Role*', 'Specialization', 'Registration Number',
      'Status*', 'Profile Picture URL'
    ];
    
    // Create sample data row
    const sampleData = [
      'John Doe', 'john.doe@example.com', '+27 123 456 7890',
      '123 Main St', 'Cape Town', 'Western Cape', '8001', 'South Africa',
      'Doctor', 'Cardiologist', 'HPCSA123456',
      'Active', 'https://example.com/profile.jpg'
    ];
    
    // Create explanation row (showing required fields, options, etc.)
    const explanationRow = [
      'Required', 'Required', 'Required',
      'Required', 'Required', 'Required', 'Required', 'Required',
      'Required - Options: Doctor, Nurse, Admin, Lab Technician, Pharmacist, Radiologist, Paramedic',
      'Required for Doctors - See Specialization sheet', 'HPCSA Number for medical roles',
      'Required - Options: Active, On Leave, Suspended, Resigned', 'Optional'
    ];
    
    // Create main worksheet
    const wsData = [headers, sampleData, explanationRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Format headers
    const headerCellStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFFAA00" } } };
    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = headerCellStyle;
    }
    
    // Create a second sheet with specialization options
    const specializationValues = Object.values(this.getSpecializationEnum());
    const specializationWS = XLSX.utils.aoa_to_sheet([
      ['Available Specializations (For Doctors)'],
      ...specializationValues.map(spec => [spec])
    ]);
    
    // Create workbook with both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Template');
    XLSX.utils.book_append_sheet(wb, specializationWS, 'Specializations');
    
    // Generate Excel file as a blob
    // Use writeXLSX instead of write with 'blob' type
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  
  /**
   * Parse an Excel file containing staff data
   * @param file The uploaded Excel file
   * @param facilityId The ID of the facility these staff will belong to
   * @returns Promise resolving to an array of Staff objects and validation errors
   */
  static parseStaffExcel(file: File, facilityId: string): Promise<{
    validStaff: Staff[],
    errors: { row: number, message: string }[]
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert sheet to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const validStaff: Staff[] = [];
          const errors: { row: number, message: string }[] = [];
          
          // Process each row
          jsonData.forEach((row: any, index: number) => {
            try {
              // Skip explanation row if present
              if (index === 1 && row['Name*']?.includes('Required')) {
                return;
              }
              
              // Validate required fields
              const requiredFields = ['Name*', 'Email*', 'Phone*', 'Street*', 'City*', 
                                      'Province*', 'Postal Code*', 'Country*', 'Role*', 'Status*'];
              
              for (const field of requiredFields) {
                if (!row[field]) {
                  errors.push({ row: index + 2, message: `Missing required field: ${field}` });
                  return;
                }
              }
              
              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(row['Email*'])) {
                errors.push({ row: index + 2, message: 'Invalid email format' });
                return;
              }
              
              // Validate role
              const validRoles = ['Doctor', 'Nurse', 'Admin', 'Lab Technician', 'Pharmacist', 'Radiologist', 'Paramedic'];
              if (!validRoles.includes(row['Role*'])) {
                errors.push({ row: index + 2, message: `Invalid role: ${row['Role*']}` });
                return;
              }
              
              // Check doctor specialization
              if (row['Role*'] === 'Doctor' && !row['Specialization']) {
                errors.push({ row: index + 2, message: 'Doctors require a specialization' });
                return;
              }
              
              // Validate status
              const validStatuses = ['Active', 'On Leave', 'Suspended', 'Resigned'];
              if (!validStatuses.includes(row['Status*'])) {
                errors.push({ row: index + 2, message: `Invalid status: ${row['Status*']}` });
                return;
              }
              
              // Create staff object
              const staff: Staff = {
                staffId: '', // This will be assigned by Firestore
                facilityId: facilityId,
                name: row['Name*'],
                email: row['Email*'],
                phone: row['Phone*'],
                address: {
                  street: row['Street*'],
                  city: row['City*'],
                  province: row['Province*'],
                  postalCode: row['Postal Code*'],
                  country: row['Country*']
                },
                role: row['Role*'] as Staff['role'],
                assignedPatients: [],
                status: row['Status*'] as Staff['status'],
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Add optional fields if present
              if (row['Specialization']) {
                staff.specialization = row['Specialization'] as Specialization;
              }
              
              if (row['Registration Number']) {
                staff.registrationNumber = row['Registration Number'];
              }
              
              if (row['Profile Picture URL']) {
                staff.profilePictureUrl = row['Profile Picture URL'];
              }
              
              validStaff.push(staff);
            } catch (error) {
              errors.push({ row: index + 2, message: 'Error processing row: ' + error });
            }
          });
          
          resolve({ validStaff, errors });
        } catch (error) {
          reject(`Error parsing Excel file: ${error}`);
        }
      };
      
      reader.onerror = (error) => {
        reject(`Error reading file: ${error}`);
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Export staff data to Excel
   * @param staff Array of staff to export
   * @returns Blob containing the Excel file
   */
  static exportStaffToExcel(staff: Staff[]): Blob {
    // Create headers
    const headers = [
      'Staff ID', 'Name', 'Email', 'Phone', 
      'Street', 'City', 'Province', 'Postal Code', 'Country',
      'Role', 'Specialization', 'Registration Number',
      'Status', 'Assigned Patients', 'Profile Picture URL',
      'Created At', 'Updated At'
    ];
    
    // Convert staff data to rows
    const rows = staff.map(s => [
      s.staffId,
      s.name,
      s.email,
      s.phone,
      s.address.street,
      s.address.city,
      s.address.province,
      s.address.postalCode,
      s.address.country,
      s.role,
      s.specialization || '',
      s.registrationNumber || '',
      s.status,
      s.assignedPatients.join(', '),
      s.profilePictureUrl || '',
      s.createdAt.toISOString(),
      s.updatedAt.toISOString()
    ]);
    
    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    
    // Generate Excel file as blob
    // Use writeXLSX instead of write with 'blob' type
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  
  /**
   * Helper method to get all specialization enum values
   * @returns Array of specialization values
   */
  private static getSpecializationEnum(): string[] {
    return [
      'General Practitioner',
      'Cardiologist',
      'Dermatologist',
      'Neurologist',
      'Orthopedic Surgeon',
      'Pediatrician',
      'Psychiatrist',
      'Oncologist',
      'Radiologist',
      'Anesthesiologist',
      'Gynecologist',
      'Ophthalmologist',
      'ENT Specialist',
      'Urologist',
      'Endocrinologist',
      'Pulmonologist',
      'Emergency Medicine',
      'Nephrologist',
      'Gastroenterologist',
      'Hematologist',
      'Infectious Disease Specialist',
      'Plastic Surgeon',
      'Physical Therapist',
      'Pharmacist',
      'Nurse Practitioner',
      'Other'
    ];
  }
  
  /**
   * Download file helper
   * @param blob The file blob to download
   * @param filename The name to save the file as
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}