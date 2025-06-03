import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { EHR } from '../shared/models/ehr.model';
import { MedicalCondition } from '../shared/models/medicalHistory.model';
import { Prescription } from '../shared/models/prescription.model';
import { LabResult } from '../shared/models/labResult.model';
import { RadiologyResult } from '../shared/models/radiologyResult.model';
import { DateUtils } from '../shared/utils/date-utils';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class DiagnosesService {
  
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) { }

  // Add diagnosis to medical history
  addDiagnosis(ehrId: string, diagnosis: MedicalCondition): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can add diagnoses'));
        }
        
        // Ensure diagnosedDate is a proper Firestore timestamp
        const diagnosisToSave = {
          ...diagnosis,
          diagnosedDate: diagnosis.diagnosedDate instanceof Date ? 
                        firebase.firestore.Timestamp.fromDate(diagnosis.diagnosedDate) : 
                        diagnosis.diagnosedDate
        };
        
        return this.firestore.doc<EHR>(`ehrs/${ehrId}`).get().pipe(
          switchMap(ehrDoc => {
            if (!ehrDoc.exists) {
              return throwError(() => new Error('EHR record not found'));
            }
            
            const ehr = ehrDoc.data() as EHR;
            const updatedConditions = [...ehr.medicalHistory.conditions, diagnosisToSave];
            
            return from(this.firestore.doc(`ehrs/${ehrId}`).update({
              'medicalHistory.conditions': updatedConditions,
              'medicalHistory.updatedAt': firebase.firestore.Timestamp.now(),
              'medicalHistory.lastUpdatedBy': user.uid,
              lastUpdated: firebase.firestore.Timestamp.now()
            }));
          })
        );
      })
    );
  }

  // Add prescription to prescriptions collection
  addPrescription(ehrId: string, prescription: Prescription): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can add prescriptions'));
        }
        
        // Ensure issuedAt is a proper Firestore timestamp
        const prescriptionToSave = {
          ...prescription,
          issuedAt: prescription.issuedAt instanceof Date ? 
                   firebase.firestore.Timestamp.fromDate(prescription.issuedAt) : 
                   prescription.issuedAt,
          ehrId: ehrId, // Add reference to the EHR
          createdBy: user.uid
        };
        
        // Save directly to prescriptions collection
        return from(this.firestore.collection('prescriptions').doc(prescription.prescriptionId).set(prescriptionToSave)).pipe(
          switchMap(() => {
            // Update the EHR lastUpdated timestamp
            return from(this.firestore.doc(`ehrs/${ehrId}`).update({
              lastUpdated: firebase.firestore.Timestamp.now()
            }));
          })
        );
      })
    );
  }

  // Add lab result to labResults collection
  addLabResult(ehrId: string, labResult: LabResult): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can add lab results'));
        }
        
        // Ensure issuedAt is a proper Firestore timestamp
        const labResultToSave = {
          ...labResult,
          issuedAt: labResult.issuedAt instanceof Date ? 
                   firebase.firestore.Timestamp.fromDate(labResult.issuedAt) : 
                   labResult.issuedAt,
          ehrId: ehrId, // Add reference to the EHR
          createdBy: user.uid
        };
        
        // Save directly to labResults collection
        return from(this.firestore.collection('labResults').doc(labResultToSave.laborderId).set(labResultToSave)).pipe(
          switchMap(() => {
            // Update the EHR lastUpdated timestamp
            return from(this.firestore.doc(`ehrs/${ehrId}`).update({
              lastUpdated: firebase.firestore.Timestamp.now()
            }));
          })
        );
      })
    );
  }

  // Add radiology result to radiologyResults collection
  addRadiologyResult(ehrId: string, radiologyResult: RadiologyResult): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        
        if (user.type !== 'facility' && user.type !== 'staff') {
          return throwError(() => new Error('Unauthorized: Only facilities and staff can add radiology results'));
        }
        
        // Ensure issuedAt is a proper Firestore timestamp
        const radiologyResultToSave = {
          ...radiologyResult,
          issuedAt: radiologyResult.issuedAt instanceof Date ? 
                   firebase.firestore.Timestamp.fromDate(radiologyResult.issuedAt) : 
                   radiologyResult.issuedAt,
          ehrId: ehrId, // Add reference to the EHR
          createdBy: user.uid
        };
        
        // Save directly to radiologyResults collection
        return from(this.firestore.collection('radiologyResults').doc(radiologyResultToSave.radiologyId).set(radiologyResultToSave)).pipe(
          switchMap(() => {
            // Update the EHR lastUpdated timestamp
            return from(this.firestore.doc(`ehrs/${ehrId}`).update({
              lastUpdated: firebase.firestore.Timestamp.now()
            }));
          })
        );
      })
    );
  }

  // Get all diagnoses for a specific EHR
  getDiagnoses(ehrId: string): Observable<MedicalCondition[]> {
    return this.firestore.doc<EHR>(`ehrs/${ehrId}`).valueChanges().pipe(
      map(ehr => {
        if (!ehr) {
          return [];
        }
        return ehr.medicalHistory?.conditions || [];
      })
    );
  }

  // Get prescriptions for a specific patient
  getPrescriptions(patientId: string): Observable<Prescription[]> {
    return this.firestore.collection<Prescription>('prescriptions', 
      ref => ref.where('patientId', '==', patientId).orderBy('issuedAt', 'desc')
    ).valueChanges();
  }

  // Get lab results for a specific patient
  getLabResults(patientId: string): Observable<LabResult[]> {
    return this.firestore.collection<LabResult>('labResults', 
      ref => ref.where('patientId', '==', patientId).orderBy('issuedAt', 'desc')
    ).valueChanges();
  }

  // Get radiology results for a specific patient
  getRadiologyResults(patientId: string): Observable<RadiologyResult[]> {
    return this.firestore.collection<RadiologyResult>('radiologyResults', 
      ref => ref.where('patientId', '==', patientId).orderBy('issuedAt', 'desc')
    ).valueChanges();
  }

  
}