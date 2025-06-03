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
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.page.html',
  styleUrls: ['./patients.page.scss'],
})
export class PatientsPage implements OnInit {
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
