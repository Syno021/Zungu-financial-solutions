import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { AddStaffService } from 'src/app/services/add-staff.service';
import { AuthService } from 'src/app/services/auth.service';

import { Staff, Specialization } from 'src/app/shared/models/staff.model';
import { Address } from 'src/app/shared/models/address.model';


@Component({
  selector: 'app-add-staff',
  templateUrl: './add-staff.page.html',
  styleUrls: ['./add-staff.page.scss'],
})
export class AddStaffPage implements OnInit {
  // Form controls
  staffForm: FormGroup;
  
  // Default password
  private defaultPassword: string = 'Default@123';
  
  // Mode selection
  selectedMode: 'single' | 'batch' = 'single';
  
  // UI control
  showSpecialization: boolean = false;
  isLoading: boolean = false;
  loadingMessage: string = 'Loading...';
  
  // Specialization options for doctors
  specializations: Specialization[] = [
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
  
  // Batch import properties
  selectedFile: File | null = null;
  importResults: {
    successful: { staff: Staff, id: string }[],
    failed: { staff: Staff, error: string }[],
    validationErrors: { row: number, message: string }[]
  } | null = null;
  
  // Current facility
  facilityId: string = '';
  selectedICDCodes: any;

  constructor(
    private formBuilder: FormBuilder,
    private addStaffService: AddStaffService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router,
   
  ) {
    // Initialize the form (without password field)
    this.staffForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      role: ['', [Validators.required]],
      specialization: [''],
      registrationNumber: [''],
      status: ['Active', [Validators.required]],
      profilePictureUrl: [''],
      address: this.formBuilder.group({
        street: ['', [Validators.required]],
        city: ['', [Validators.required]],
        province: ['', [Validators.required]],
        postalCode: ['', [Validators.required]],
        country: ['', [Validators.required]]
      })
    });
  }

  // Convenience getter for address form
  get addressForm(): AbstractControl {
    return this.staffForm.get('address') as FormGroup;
  }

  ngOnInit() {
    this.loadFacilityId();
  }

  // Load the current facility ID
  loadFacilityId() {
    this.isLoading = true;
    this.loadingMessage = 'Loading facility information...';
    
    this.addStaffService.getCurrentFacilityId().subscribe({
      next: (id) => {
        this.facilityId = id;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.presentAlert('Error', 'Failed to load facility information. Please ensure you are logged in with a facility account.');
        console.error('Failed to get facility ID:', error);
      }
    });
  }

  // Handle segment change
  segmentChanged() {
    this.importResults = null;
    this.selectedFile = null;
  }

  // Handle role change to show/hide specialization
  roleChanged() {
    const role = this.staffForm.get('role')?.value;
    this.showSpecialization = role === 'Doctor';
    
    const specializationControl = this.staffForm.get('specialization');
    if (this.showSpecialization) {
      specializationControl?.setValidators([Validators.required]);
    } else {
      specializationControl?.clearValidators();
      specializationControl?.setValue('');
    }
    specializationControl?.updateValueAndValidity();
  }

  // Add a single staff member
  addSingleStaff() {
    if (this.staffForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.loadingMessage = 'Adding staff member...';
    
    const formValue = this.staffForm.value;
    
    // Prepare staff object
    const staff: Staff = {
      staffId: '', // This will be assigned by Firestore
      facilityId: this.facilityId,
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone,
      role: formValue.role,
      status: formValue.status,
      address: formValue.address as Address,
      assignedPatients: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add optional fields if present
    if (formValue.specialization) {
      staff.specialization = formValue.specialization;
    }
    
    if (formValue.registrationNumber) {
      staff.registrationNumber = formValue.registrationNumber;
    }
    
    if (formValue.profilePictureUrl) {
      staff.profilePictureUrl = formValue.profilePictureUrl;
    }
    
    // Use default password
    this.addStaffService.addSingleStaff(staff, this.defaultPassword).subscribe({
      next: (staffId) => {
        this.isLoading = false;
        if (staffId.startsWith('Error:')) {
          this.presentAlert('Error', `Failed to add staff: ${staffId}`);
        } else {
          this.presentToast('Staff member added successfully');
          this.resetForm();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.presentAlert('Error', `Failed to add staff: ${error.message}`);
      }
    });
  }

  // File selection handler
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.importResults = null;
    }
  }

  // Download Excel template
  downloadTemplate() {
    if (!this.facilityId) {
      this.presentAlert('Error', 'Facility ID not found. Please ensure you are logged in properly.');
      return;
    }
    
    this.addStaffService.generateStaffTemplate(this.facilityId);
  }

  // Import staff from Excel
  importStaff() {
    if (!this.selectedFile) {
      this.presentAlert('Error', 'Please select a file first');
      return;
    }
    
    this.isLoading = true;
    this.loadingMessage = 'Importing staff...';
    
    // Always use the default password
    const generatePassword = (_: Staff): string => {
      return this.defaultPassword;
    };
    
    this.addStaffService.addStaffFromExcel(
      this.selectedFile, 
      this.facilityId,
      generatePassword
    ).subscribe({
      next: (results) => {
        this.isLoading = false;
        this.importResults = results;
        
        const successCount = results.successful.length;
        const failedCount = results.failed.length;
        const errorCount = results.validationErrors.length;
        
        let message = '';
        if (successCount > 0) {
          message += `${successCount} staff members added successfully. `;
        }
        if (failedCount > 0 || errorCount > 0) {
          message += `${failedCount + errorCount} errors found. Please check the results.`;
        }
        
        this.presentToast(message);
      },
      error: (error) => {
        this.isLoading = false;
        this.presentAlert('Import Error', `Failed to import staff: ${error.message}`);
      }
    });
  }

  // Reset the form
  resetForm() {
    this.staffForm.reset({
      status: 'Active'
    });
    this.showSpecialization = false;
  }

  // Present an alert
  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Present a toast notification
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }


}
  