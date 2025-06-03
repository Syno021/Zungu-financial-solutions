import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from, of, forkJoin } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
// Add this import for the Timestamp type
import { Timestamp } from 'firebase/firestore';

import { Staff } from 'src/app/shared/models/staff.model';
import { AuthService } from './auth.service';
import { StaffExcelUtils } from 'src/app/shared/utils/staff-excel.util';

@Injectable({
  providedIn: 'root'
})
export class AddStaffService {
  
  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private authService: AuthService
  ) { }
  
  /**
   * Add a single staff member manually
   * @param staff Staff data to add
   * @param password Initial password for the staff member
   * @returns Observable of the created staff ID
   */
  addSingleStaff(staff: Staff, password: string): Observable<string> {
    // First create the auth user
    return from(this.authService.registerUser(staff.email, password)).pipe(
      switchMap(credential => {
        // Then add the staff record to Firestore
        const staffWithoutId = { ...staff };
        delete (staffWithoutId as any).staffId; // Remove staffId as Firestore will generate one
        
        return from(this.firestore.collection('staff').add(staffWithoutId)).pipe(
          map(docRef => {
            // Update the staff object with the generated ID
            this.firestore.collection('staff').doc(docRef.id).update({ staffId: docRef.id });
            return docRef.id;
          })
        );
      }),
      catchError(error => {
        // If user creation fails, handle the error
        console.error('Error adding staff:', error);
        // If the user was created but Firestore failed, we should clean up the auth user
        return of('Error: ' + error.message);
      })
    );
  }
  
  /**
   * Process and add multiple staff from an Excel file
   * @param file The Excel file containing staff data
   * @param facilityId The ID of the facility these staff will belong to
   * @param generatePassword Function to generate a password for each staff member
   * @returns Observable of processing results
   */
  addStaffFromExcel(
    file: File, 
    facilityId: string,
    generatePassword: (staff: Staff) => string
  ): Observable<{
    successful: { staff: Staff, id: string }[],
    failed: { staff: Staff, error: string }[],
    validationErrors: { row: number, message: string }[]
  }> {
    return from(StaffExcelUtils.parseStaffExcel(file, facilityId)).pipe(
      switchMap(result => {
        const { validStaff, errors } = result;
        
        if (validStaff.length === 0) {
          return of({
            successful: [],
            failed: [],
            validationErrors: errors
          });
        }
        
        // Process each valid staff member
        const addObservables = validStaff.map(staff => {
          const password = generatePassword(staff);
          
          return this.addSingleStaff(staff, password).pipe(
            map(id => {
              if (id.startsWith('Error:')) {
                return { success: false, staff, error: id };
              } else {
                return { success: true, staff: { ...staff, staffId: id }, id };
              }
            }),
            catchError(error => {
              return of({ success: false, staff, error: error.message });
            })
          );
        });
        
        // Combine all results
        return forkJoin(addObservables).pipe(
          map(results => {
            const successful: { staff: Staff, id: string }[] = [];
            const failed: { staff: Staff, error: string }[] = [];
            
            results.forEach(result => {
              if (result.success) {
                successful.push({ 
                  staff: result.staff as Staff, 
                  id: (result as any).id 
                });
              } else {
                failed.push({ 
                  staff: result.staff, 
                  error: (result as any).error 
                });
              }
            });
            
            return {
              successful,
              failed,
              validationErrors: errors
            };
          })
        );
      })
    );
  }
  
  /**
   * Generate template for batch staff registration
   * @param facilityId The ID of the facility
   */
  generateStaffTemplate(facilityId: string): void {
    const blob = StaffExcelUtils.generateStaffTemplate(facilityId);
    StaffExcelUtils.downloadFile(blob, `staff_template_${facilityId}.xlsx`);
  }
  
  /**
   * Export current staff to Excel
   * @param facilityId Facility ID to filter staff by
   */
  exportStaffToExcel(facilityId: string): Observable<void> {
    return this.firestore.collection<Staff>('staff', ref => 
      ref.where('facilityId', '==', facilityId)
    ).get().pipe(
      map(snapshot => {
        const staff = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Fixed timestamp handling with proper type checking
          return {
            ...data,
            staffId: doc.id,
            createdAt: this.convertToDate(data.createdAt),
            updatedAt: this.convertToDate(data.updatedAt)
          } as Staff;
        });
        
        const blob = StaffExcelUtils.exportStaffToExcel(staff);
        StaffExcelUtils.downloadFile(blob, `staff_${facilityId}.xlsx`);
      })
    );
  }
  
  /**
   * Helper method to convert various timestamp formats to Date
   * @param timestamp The timestamp to convert
   * @returns A JavaScript Date object
   */
  private convertToDate(timestamp: any): Date {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Check if it's a Firestore Timestamp object
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle UNIX timestamp (number) or ISO string
    if (timestamp) {
      return new Date(timestamp);
    }
    
    // Default fallback
    return new Date();
  }
  
  /**
   * Get the current facility ID from the authenticated user
   */
  getCurrentFacilityId(): Observable<string> {
    return this.authService.getCurrentUser().pipe(
      map(user => {
        if (!user) {
          throw new Error('No authenticated user');
        }
        
        if (user.type === 'facility') {
          return user.data.facilityId;
        } else if (user.type === 'staff') {
          return (user.data as Staff).facilityId;
        } else {
          throw new Error('User is not authorized to add staff');
        }
      })
    );
  }
}