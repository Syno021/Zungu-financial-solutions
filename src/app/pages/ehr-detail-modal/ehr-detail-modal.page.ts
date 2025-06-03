import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EHR } from '../../shared/models/ehr.model';
import { AuthService } from '../../services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Address } from '../../shared/models/address.model';
import { NextOfKin } from '../../shared/models/nextOfKin.model';
import { Observable } from 'rxjs';
import { Prescription } from '../../shared/models/prescription.model';
import { LabResult } from '../../shared/models/labResult.model';
import { RadiologyResult } from '../../shared/models/radiologyResult.model';
import { PdfExportService } from 'src/app/services/pdf-export.service';

@Component({
  selector: 'app-ehr-detail-modal',
  templateUrl: './ehr-detail-modal.page.html',
  styleUrls: ['./ehr-detail-modal.page.scss'],
})
export class EhrDetailModalPage implements OnInit {
  @Input() ehr!: EHR;
  activeSegment = 'patient-info';
  isFullscreen = false;
  
  // Collections for related data
  prescriptions: Prescription[] = [];
  labResults: LabResult[] = [];
  radiologyResults: RadiologyResult[] = [];
  
  // Loading states
  loadingPrescriptions = false;
  loadingLabResults = false;
  loadingRadiologyResults = false;
  isGeneratingPdf = false;
  constructor(
    private modalController: ModalController,
    private authService: AuthService,
    private firestore: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private pdfExportService: PdfExportService
  ) {}

  ngOnInit() {
    console.log('EHR structure:', JSON.stringify(this.ehr, null, 2));
    // Load related data when the component initializes
    this.loadRelatedData();
  }
  
  loadRelatedData() {
    if (this.ehr && this.ehr.patientId) {
      this.loadPrescriptions();
      this.loadLabResults();
      this.loadRadiologyResults();
    }
  }
  async generatePDF() {
    // First check if all data is loaded
    if (this.loadingPrescriptions || this.loadingLabResults || this.loadingRadiologyResults) {
      await this.presentAlert('Please wait', 'Still loading patient data. Please try again in a moment.');
      return;
    }
    
    try {
      this.isGeneratingPdf = true;
      await this.pdfExportService.generateMedicalRecordPdf(
        this.ehr,
        this.prescriptions,
        this.labResults,
        this.radiologyResults
      );
      this.presentAlert('Success', 'Medical record PDF has been generated and downloaded.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.presentAlert('Error', 'There was a problem generating the PDF. Please try again.');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  loadPrescriptions() {
    this.loadingPrescriptions = true;
    
    // Fetch prescriptions by patientId instead of using prescription IDs
    this.firestore.collection('prescriptions', ref => 
      ref.where('patientId', '==', this.ehr.patientId)
    ).get().toPromise()
    .then(snapshot => {
      if (snapshot && !snapshot.empty) {
        this.prescriptions = snapshot.docs.map(doc => doc.data() as Prescription);
      } else {
        this.prescriptions = [];
      }
      this.loadingPrescriptions = false;
    })
    .catch(error => {
      console.error('Error loading prescriptions:', error);
      this.loadingPrescriptions = false;
    });
  }
  
  loadLabResults() {
    this.loadingLabResults = true;
    
    // Fetch lab results by patientId
    this.firestore.collection('labResults', ref => 
      ref.where('patientId', '==', this.ehr.patientId)
    ).get().toPromise()
    .then(snapshot => {
      if (snapshot && !snapshot.empty) {
        this.labResults = snapshot.docs.map(doc => doc.data() as LabResult);
      } else {
        this.labResults = [];
      }
      this.loadingLabResults = false;
    })
    .catch(error => {
      console.error('Error loading lab results:', error);
      this.loadingLabResults = false;
    });
  }
  
  loadRadiologyResults() {
    this.loadingRadiologyResults = true;
    
    // Fetch radiology results by patientId
    this.firestore.collection('radiologyResults', ref => 
      ref.where('patientId', '==', this.ehr.patientId)
    ).get().toPromise()
    .then(snapshot => {
      if (snapshot && !snapshot.empty) {
        this.radiologyResults = snapshot.docs.map(doc => doc.data() as RadiologyResult);
      } else {
        this.radiologyResults = [];
      }
      this.loadingRadiologyResults = false;
    })
    .catch(error => {
      console.error('Error loading radiology results:', error);
      this.loadingRadiologyResults = false;
    });
  }

  dismissModal(refresh = false) {
    this.modalController.dismiss({
      refresh: refresh
    });
  }

  segmentChanged(event: CustomEvent) {
    this.activeSegment = event.detail.value;
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    document.querySelector('.ehr-detail-modal')?.classList.toggle('fullscreen-modal');
  }

  async authenticateAsPatient() {
    const loading = await this.loadingController.create({
      message: 'Processing...'
    });
    await loading.present();
  
    try {
      // Check if patient already exists
      const patientSnapshot = await this.firestore
        .collection('patients', ref => ref.where('email', '==', this.ehr.email))
        .get()
        .toPromise();
  
      if (!patientSnapshot?.empty) {
        loading.dismiss();
        this.presentAlert('Account Exists', 'A patient account with this email already exists.');
        return;
      }
  
      // Set default password for initial setup
      const tempPassword = "Default@123";
     
      // Create auth user
      const userCredential = await this.authService.registerUser(this.ehr.email, tempPassword).toPromise();
     
      if (!userCredential || !userCredential.user) {
        throw new Error('Failed to create authentication account');
      }
  
      // Use existing patientId instead of generating a new one
      const patientId = this.ehr.patientId;
      const facilityId = this.ehr.facilityId || ''; // Default empty string if not available
     
      const patientData = {
        patientId: patientId, // Using existing patientId
        facilityId: facilityId,
        name: this.ehr.name,
        email: this.ehr.email,
        saIdNumber: this.ehr.saIdNumber || '',
        dob: this.ehr.dob || new Date(),
        gender: this.transformGender(this.ehr.gender),
        contactNumber: this.ehr.contactNumber || '',
        address: this.ehr.address || this.createDefaultAddress(),
        nextOfKin: this.ehr.nextOfKin || this.createDefaultNextOfKin(),
        qrCode: patientId, // Using patientId as QR code for simplicity
        registeredAt: new Date()
      };
  
      // Use patientId as the document ID when saving to Firestore
      await this.firestore.collection('patients').doc(patientId).set(patientData);
     
      loading.dismiss();
     
      // Send password reset email so patient can set their own password
      await this.authService.resetPassword(this.ehr.email).toPromise();
     
      this.presentAlert(
        'Patient Account Created',
        `The patient account has been created successfully. A password reset email has been sent to ${this.ehr.email}.`
      );
    } catch (error) {
      loading.dismiss();
      console.error('Error creating patient account:', error);
      this.presentAlert('Error', 'Failed to create patient account. Please try again.');
    }
  }
  

  private transformGender(gender: string): 'Male' | 'Female' | 'Other' {
    const normalized = gender?.toLowerCase() || '';
    if (normalized.includes('male')) return 'Male';
    if (normalized.includes('female')) return 'Female';
    return 'Other';
  }

  private createDefaultAddress(): Address {
    return {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: ''
    };
  }

  private createDefaultNextOfKin(): NextOfKin {
    return {
      name: '',
      relationship: '',
      contactNumber: '',
      address: this.createDefaultAddress()
    };
  }

  private async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}