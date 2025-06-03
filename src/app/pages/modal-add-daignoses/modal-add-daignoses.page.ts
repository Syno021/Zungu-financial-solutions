import { Component, OnInit, Input, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { DiagnosesService } from '../../services/diagnosis.service';
import { EHR } from '../../shared/models/ehr.model';
import { MedicalCondition } from '../../shared/models/medicalHistory.model';
import { Prescription } from '../../shared/models/prescription.model';
import { LabResult } from '../../shared/models/labResult.model';
import { RadiologyResult } from '../../shared/models/radiologyResult.model';
import { AuthService } from '../../services/auth.service';
import { CustomIdUtil } from '../../shared/utils/customeId.util';

import { switchMap, finalize } from 'rxjs/operators';
@Component({
  selector: 'app-modal-add-daignoses',
  templateUrl: './modal-add-daignoses.page.html',
  styleUrls: ['./modal-add-daignoses.page.scss'],
})
export class ModalAddDiagnosesPage implements OnInit {
  @Input() ehr!: EHR;
  
  segment: string = 'diagnosis';
  diagnosisForm!: FormGroup;
  prescriptionForm!: FormGroup;
  labResultForm!: FormGroup;
  radiologyForm!: FormGroup;
  
  loading: boolean = false;
  error: string | null = null;
  isFullscreen = false;
  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private diagnosesService: DiagnosesService,
    private toastController: ToastController,
    private authService: AuthService,
    private el: ElementRef
  ) { }
  
  ngOnInit() {
    this.initForms();
  }
  async toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    const modal = await this.modalController.getTop();
    if (modal) {
      modal.classList.toggle('fullscreen-modal');
    } else {
      console.error('Modal element not found');
    }
  }

  initForms() {
    // Diagnosis Form
    this.diagnosisForm = this.formBuilder.group({
      icd10Code: ['', Validators.required],
      snomedCode: ['', Validators.required],
      name: ['', Validators.required],
      diagnosedDate: [new Date().toISOString(), Validators.required],
      status: ['Active', Validators.required],
      notes: [''],
      treatingPhysician: ['', Validators.required]
    });
    
    // Prescription Form
    this.prescriptionForm = this.formBuilder.group({
      medication: ['', Validators.required],
      dosage: ['', Validators.required],
      duration: ['', Validators.required]
    });
    
    // Lab Result Form
    this.labResultForm = this.formBuilder.group({
      loincCode: ['', Validators.required],
      testName: ['', Validators.required],
      result: ['', Validators.required]
    });
    
    // Radiology Form
    this.radiologyForm = this.formBuilder.group({
      scanType: ['', Validators.required],
      findings: ['', Validators.required]
    });
  }
  
  segmentChanged(event: any) {
    this.segment = event.detail.value;
  }
  
  dismiss(refresh: boolean = false) {
    this.modalController.dismiss({
      refresh: refresh
    });
  }
  
  async addDiagnosis() {
    if (!this.diagnosisForm.valid) {
      this.presentToast('Please fill all required fields for diagnosis');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    // Use the AuthService to get current user
    this.authService.getCurrentUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }
        
        const formValue = this.diagnosisForm.value;
        const diagnosedDate = new Date(formValue.diagnosedDate);
        
        const diagnosis: MedicalCondition = {
          ...formValue,
          diagnosedDate: diagnosedDate,
          staffId: currentUser.uid  // Add staffId
        };
        
        return this.diagnosesService.addDiagnosis(this.ehr.id, diagnosis);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.presentToast('Diagnosis added successfully');
        this.dismiss(true);
      },
      error: (err) => {
        this.error = err.message;
        this.presentToast('Failed to add diagnosis: ' + err.message);
      }
    });
  }
  
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  async addPrescription() {
    if (!this.prescriptionForm.valid) {
      this.presentToast('Please fill all required fields for prescription');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.authService.getCurrentUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }
        
        // Use CustomIdUtil to generate prescription ID
        const prescriptionId = CustomIdUtil.generatePrescriptionId();
        
        const prescription: Prescription = {
          prescriptionId: prescriptionId,
          patientId: this.ehr.patientId,
          doctorId: currentUser.uid,
          facilityId: this.ehr.facilityId,
          medication: this.prescriptionForm.value.medication,
          dosage: this.prescriptionForm.value.dosage,
          duration: this.prescriptionForm.value.duration,
          issuedAt: new Date(),
          staffId: currentUser.uid  // Add staffId
        };
        
        return this.diagnosesService.addPrescription(this.ehr.id, prescription);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.presentToast('Prescription added successfully');
        this.dismiss(true);
      },
      error: (err) => {
        this.error = err.message;
        this.presentToast('Failed to add prescription: ' + err.message);
      }
    });
  }
  
  async addLabResult() {
    if (!this.labResultForm.valid) {
      this.presentToast('Please fill all required fields for lab result');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.authService.getCurrentUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }
        
        // Use CustomIdUtil to generate lab order ID
        const laborderId = CustomIdUtil.generateLabOrderId();
        
        const labResult: LabResult = {
          laborderId: laborderId,
          patientId: this.ehr.patientId,
          loincCode: this.labResultForm.value.loincCode,
          testName: this.labResultForm.value.testName,
          result: this.labResultForm.value.result,
          orderedBy: currentUser.uid,
          issuedAt: new Date(),
          emailSent: false,
          staffId: currentUser.uid  // Add staffId
        };
        
        return this.diagnosesService.addLabResult(this.ehr.id, labResult);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.presentToast('Lab result added successfully');
        this.dismiss(true);
      },
      error: (err) => {
        this.error = err.message;
        this.presentToast('Failed to add lab result: ' + err.message);
      }
    });
  }
  
  async addRadiologyResult() {
    if (!this.radiologyForm.valid) {
      this.presentToast('Please fill all required fields for radiology result');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.authService.getCurrentUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }
        
        // Use CustomIdUtil to generate radiology ID
        const radiologyId = CustomIdUtil.generateRadiologyId();
        
        const radiologyResult: RadiologyResult = {
          radiologyId: radiologyId,
          patientId: this.ehr.patientId,
          scanType: this.radiologyForm.value.scanType,
          findings: this.radiologyForm.value.findings,
          orderedBy: currentUser.uid,
          issuedAt: new Date(),
          emailSent: false,
          staffId: currentUser.uid  // Add staffId
        };
        
        return this.diagnosesService.addRadiologyResult(this.ehr.id, radiologyResult);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.presentToast('Radiology result added successfully');
        this.dismiss(true);
      },
      error: (err) => {
        this.error = err.message;
        this.presentToast('Failed to add radiology result: ' + err.message);
      }
    });
  }
}