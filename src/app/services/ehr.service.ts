import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';
import { EHR } from '../shared/models/ehr.model';
import { EhrValidationUtil } from '../shared/utils/ehr-validation.util';
import { CustomIdUtil } from '../shared/utils/customeId.util';
import { MedicalHistory } from '../shared/models/medicalHistory.model';
import { Prescription } from '../shared/models/prescription.model';

@Injectable({
  providedIn: 'root'
})
export class EhrService {

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService,
    private validationUtil: EhrValidationUtil
  ) { }

  // Add a new EHR record
  addEhr(ehrData: Partial<EHR>): Observable<string> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can add EHR records'));
        }

        // Validate EHR data
        const validationErrors = this.validationUtil.validateEhrData(ehrData);
        if (validationErrors.length > 0) {
          return throwError(() => new Error(`Validation failed: ${validationErrors.join(', ')}`));
        }

        // Generate a unique ID for the EHR record
        const ehrId = this.firestore.createId();
        
        // Set facility ID from authenticated user
        const facilityId = user.type === 'facility' 
          ? user.data.facilityId 
          : (user.data as any).facilityId; // staff has facilityId property
        
        // Create empty medical history if needed
        const defaultMedicalHistory: MedicalHistory = {
          id: this.firestore.createId(),
          patientId: ehrData.patientId || '',
          facilityId: facilityId,
          conditions: [],
          surgeries: [],
          allergies: [],
          immunizations: [],
          familyHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.uid,
          lastUpdatedBy: user.uid
        };

        // Create empty prescription if needed
        const defaultPrescription: Prescription = {
          prescriptionId: this.firestore.createId(),
          patientId: ehrData.patientId || '',
          doctorId: user.type === 'staff' ? user.uid : '',
          facilityId: facilityId,
          medication: '',
          dosage: '',
          duration: '',
          staffId:'',
          issuedAt: new Date()
        };
        
        // Prepare EHR data with required fields
        const newEhr: EHR = {
          id: ehrId,
          patientId: ehrData.patientId || '',
          surname: ehrData.surname || '',
          facilityId: facilityId,
          name: ehrData.name || '',
          email: ehrData.email || '',
          saIdNumber: ehrData.saIdNumber,
          dob: ehrData.dob || new Date(),
          gender: ehrData.gender || 'Other',
          contactNumber: ehrData.contactNumber || '',
          address: ehrData.address || {
            street: '',
            city: '',
            province: '',
            postalCode: '',
            country: ''
          },
          nextOfKin: ehrData.nextOfKin || {
            name: '',
            relationship: '',
            contactNumber: '',
            address: {
              street: '',
              city: '',
              province: '',
              postalCode: '',
              country: ''
            }
          },
          icd10DiagnosisCodes: ehrData.icd10DiagnosisCodes || [],
          snomedCodes: ehrData.snomedCodes || [],
          medicalHistory: ehrData.medicalHistory || defaultMedicalHistory,
          prescriptions: Array.isArray(ehrData.prescriptions) ? 
          ehrData.prescriptions : 
          (ehrData.prescriptions ? [ehrData.prescriptions] : [defaultPrescription]),
          labResults: ehrData.labResults || [],
          radiologyResults: ehrData.radiologyResults || [],
          lastUpdated: new Date()
        };
        
        // Save to Firestore
        return from(this.firestore.collection('ehrs').doc(ehrId).set(newEhr)).pipe(
          map(() => ehrId),
          catchError(error => {
            console.error('Error adding EHR:', error);
            return throwError(() => new Error(`Failed to add EHR: ${error.message}`));
          })
        );
      })
    );
  }

  // Get EHR by ID
  getEhrById(ehrId: string): Observable<EHR | null> {
    return this.firestore.doc<EHR>(`ehrs/${ehrId}`).valueChanges().pipe(
      map(ehr => ehr || null)
    );
  }

  // Get all EHRs for the current facility
  getEhrsForCurrentFacility(): Observable<EHR[]> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        let facilityId: string;
        if (user.type === 'facility') {
          facilityId = user.data.facilityId;
        } else if (user.type === 'staff') {
          facilityId = (user.data as any).facilityId;
        } else {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can view EHRs'));
        }
        
        return this.firestore.collection<EHR>('ehrs', ref => 
          ref.where('facilityId', '==', facilityId)
        ).valueChanges();
      })
    );
  }

  // Get EHRs for a specific patient
  getEhrsForPatient(patientId: string): Observable<EHR[]> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        return this.firestore.collection<EHR>('ehrs', ref => 
          ref.where('patientId', '==', patientId)
        ).valueChanges();
      })
    );
  }

  // Update an existing EHR
  updateEhr(ehrId: string, ehrData: Partial<EHR>): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can update EHR records'));
        }
        
        // Validate update data
        const validationErrors = this.validationUtil.validateEhrData(ehrData, true);
        if (validationErrors.length > 0) {
          return throwError(() => new Error(`Validation failed: ${validationErrors.join(', ')}`));
        }
        
        // Add lastUpdated timestamp
        const updateData = {
          ...ehrData,
          lastUpdated: new Date()
        };
        
        // Update in Firestore
        return from(this.firestore.collection('ehrs').doc(ehrId).update(updateData)).pipe(
          catchError(error => {
            console.error('Error updating EHR:', error);
            return throwError(() => new Error(`Failed to update EHR: ${error.message}`));
          })
        );
      })
    );
  }
}