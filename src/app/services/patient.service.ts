import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Patient } from '../shared/models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor(private firestore: AngularFirestore) {}

  async checkPatientExists(idNumber: any, facilityId: any): Promise<boolean> {
    const snapshot = await this.firestore.collection<Patient>('Electronic_Health_Record')
      .ref.where('idNumber', '==', idNumber)
      .where('facilityId', '==', facilityId)
      .get();
    return !snapshot.empty;
  }

  async registerPatient(patient: Patient): Promise<string> {
 // Check if patient already exists in this facility
    const exists = await this.checkPatientExists(patient.saIdNumber, patient.facilityId);
    if (exists) {
      throw new Error('Patient with this ID number already exists in this facility');
    }
    const docRef = await this.firestore.collection<Patient>('Electronic_Health_Record').add(patient);
    return docRef.id;
  }

  // generatePatientQRCode(patientId: string): string {
  //   return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${patientId}`;
  // }

  async getPatientById(patientId: string): Promise<Patient> {
    const doc:any = await this.firestore.collection<Patient>('Electronic_Health_Record')
      .doc(patientId)
      .get()
      .toPromise();
    return doc.data();
  }


  async getPatientsByFacility(facilityId: string): Promise<Patient[]> {
    const snapshot = await this.firestore.collection<Patient>('patients', 
      ref => ref.where('facilityId', '==', facilityId)).get().toPromise();
    
    if (!snapshot || !snapshot.docs.length) {
      console.log("service empty");
      return []; // Handle undefined or empty data safely
    }
  
    return snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
  }
  
  async getFacilityName(facilityId: string){
    const doc = await this.firestore.collection('facilities')
      .doc(facilityId)
      .get()
      .toPromise();
    return doc!.exists ? doc!.data() || 'Unknown Facility' : 'Unknown Facility';
  }
}