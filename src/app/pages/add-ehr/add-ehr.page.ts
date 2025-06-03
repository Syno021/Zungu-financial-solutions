import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { EhrService } from '../../services/ehr.service';
import { EhrValidationUtil } from '../../shared/utils/ehr-validation.util';
import { ToastController } from '@ionic/angular';
import { EHR } from '../../shared/models/ehr.model';
import { AuthService } from '../../services/auth.service';
import { CustomIdUtil } from '../../shared/utils/customeId.util';
import { MedicalHistory, MedicalCondition, Surgery, Allergy, Immunization, FamilyHistoryItem } from '../../shared/models/medicalHistory.model';
import { Prescription } from '../../shared/models/prescription.model';
import { ICD10SelectionModalComponent } from 'src/app/shared/components/icd10-selection-modal/icd10-selection-modal.component';
import { IICD10Code } from 'src/app/shared/models/IICD10Code.model';
import { ModalController } from '@ionic/angular';


@Component({
  selector: 'app-add-ehr',
  templateUrl: './add-ehr.page.html',
  styleUrls: ['./add-ehr.page.scss'],
})
export class AddEhrPage implements OnInit {
  ehrForm: FormGroup;
  medicalHistoryForm: FormGroup;
  prescriptionForm: FormGroup;
  loading = false;
  currentFacilityId: string | null = null;
  currentUserId: string | null = null;
  currentStaffId: string | null = null;
  
  showMedicalHistory = false;
  showPrescription = false;

  severityOptions = ['Mild', 'Moderate', 'Severe', 'Life-threatening'];
  statusOptions = ['Active', 'Resolved', 'Recurring'];
  relationshipOptions = ['Parent', 'Sibling', 'Child', 'Grandparent', 'Other'];
  siteOptions = ['Left Arm', 'Right Arm', 'Left Thigh', 'Right Thigh', 'Other'];
  icdcodes: string[] = [];
  selectedICDCodes: IICD10Code[] = []; 

  constructor(
    private formBuilder: FormBuilder,
    private ehrService: EhrService,
    private authService: AuthService,
    private validationUtil: EhrValidationUtil,
    private router: Router,
    private toastController: ToastController,
      private modalCtrl: ModalController
  ) {
    this.ehrForm = this.createForm();
    this.medicalHistoryForm = this.createMedicalHistoryForm();
    this.prescriptionForm = this.createPrescriptionForm();
  }

  ngOnInit() {
    // Get current facility ID and user ID
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        if (user.type === 'facility') {
          this.currentFacilityId = user.data.facilityId;
        } else if (user.type === 'staff') {
          this.currentFacilityId = (user.data as any).facilityId;
          this.currentStaffId = (user.data as any).staffId;
        }
      }
    });
  }

  createForm(): FormGroup {
    return this.formBuilder.group({
      patientId: [''], // Will be auto-generated
      name: ['', Validators.required],
      surname: ['', Validators.required],
      email: ['', [Validators.email]],
      saIdNumber: [''],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      contactNumber: [''],
      
      // Address fields
      street: [''],
      city: [''],
      province: [''],
      postalCode: [''],
      country: [''],
      
      // Next of kin fields
      kinName: [''],
      kinRelationship: [''],
      kinContactNumber: [''],
      
      // Medical codes
      icd10Codes: [''], // Will be split into array
      snomedCodes: [''], // Will be split into array
    });
  }

  createMedicalHistoryForm(): FormGroup {
    return this.formBuilder.group({
      conditions: this.formBuilder.array([]),
      surgeries: this.formBuilder.array([]),
      allergies: this.formBuilder.array([]),
      immunizations: this.formBuilder.array([]),
      familyHistory: this.formBuilder.array([])
    });
  }

  createPrescriptionForm(): FormGroup {
    return this.formBuilder.group({
      medication: ['', Validators.required],
      dosage: ['', Validators.required],
      duration: ['', Validators.required],
      
    });
  }

  // Form array getters
  get conditions() {
    return this.medicalHistoryForm.get('conditions') as FormArray;
  }

  get surgeries() {
    return this.medicalHistoryForm.get('surgeries') as FormArray;
  }

  get allergies() {
    return this.medicalHistoryForm.get('allergies') as FormArray;
  }

  get immunizations() {
    return this.medicalHistoryForm.get('immunizations') as FormArray;
  }

  get familyHistory() {
    return this.medicalHistoryForm.get('familyHistory') as FormArray;
  }

  // Methods to add new items to form arrays
  addCondition() {
    const conditionForm = this.formBuilder.group({
      icd10Code: [''],
      snomedCode: [''],
      name: ['', Validators.required],
      diagnosedDate: [''],
      status: ['Active'],
      notes: [''],
      treatingPhysician: ['']
    });
    this.conditions.push(conditionForm);
  }

  addSurgery() {
    const surgeryForm = this.formBuilder.group({
      cptCode: [''],
      procedureName: ['', Validators.required],
      performedDate: [''],
      surgeon: [''],
      facility: [''],
      notes: [''],
      complications: ['']
    });
    this.surgeries.push(surgeryForm);
  }

  addAllergy() {
    const allergyForm = this.formBuilder.group({
      allergen: ['', Validators.required],
      snomedCode: [''],
      reactionType: [''],
      severity: ['Mild'],
      diagnosedDate: [''],
      notes: ['']
    });
    this.allergies.push(allergyForm);
  }

  addImmunization() {
    const immunizationForm = this.formBuilder.group({
      cptCode: [''],
      vaccineName: ['', Validators.required],
      administeredDate: [''],
      administeredBy: [''],
      lotNumber: [''],
      expirationDate: [''],
      site: ['Left Arm'],
      notes: ['']
    });
    this.immunizations.push(immunizationForm);
  }

  addFamilyHistoryItem() {
    const familyHistoryForm = this.formBuilder.group({
      condition: ['', Validators.required],
      icd10Code: [''],
      relationship: ['Parent'],
      notes: ['']
    });
    this.familyHistory.push(familyHistoryForm);
  }

  // Methods to remove items from form arrays
  removeCondition(index: number) {
    this.conditions.removeAt(index);
  }

  removeSurgery(index: number) {
    this.surgeries.removeAt(index);
  }

  removeAllergy(index: number) {
    this.allergies.removeAt(index);
  }

  removeImmunization(index: number) {
    this.immunizations.removeAt(index);
  }

  removeFamilyHistoryItem(index: number) {
    this.familyHistory.removeAt(index);
  }

  // Toggle form sections
  toggleMedicalHistory() {
    this.showMedicalHistory = !this.showMedicalHistory;
    // Add at least one empty item if none exists
    if (this.showMedicalHistory && this.conditions.length === 0) {
      this.addCondition();
    }
  }

  togglePrescription() {
    this.showPrescription = !this.showPrescription;
  }

 // Add this to your AddEhrPage class
validateIdNumber() {
  const saIdNumber = this.ehrForm.get('saIdNumber')?.value;
  
  if (!saIdNumber) {
    // Optional field, so empty is fine
    return true;
  }
  
  if (this.validationUtil.isValidSaIdNumber(saIdNumber)) {
    return true;
  } else {
    // Mark the field as invalid
    this.ehrForm.get('saIdNumber')?.setErrors({ 'invalidIdNumber': true });
    return false;
  }
}

// Modify your onSubmit method to include this validation
private isTestMode = true; // Set to false in production
// Add this to your component
transformSaIdToDateOfBirth(idNumber: string): string {
  // Extract YYMMDD from SA ID
  const yearPart = idNumber.substring(0, 2);
  const monthPart = idNumber.substring(2, 4);
  const dayPart = idNumber.substring(4, 6);
  
  // Determine century (00-49 -> 2000s, 50-99 -> 1900s)
  const fullYear = parseInt(yearPart) < 50 
    ? `20${yearPart}` 
    : `19${yearPart}`;
  
  // Return YYYY-MM-DD format
  return `${fullYear}-${monthPart}-${dayPart}`;
}

// Update your onSubmit method
onSubmit() {
  // If there's an ID number but no DOB, try to extract DOB from ID
  const idNumber = this.ehrForm.get('saIdNumber')?.value;
  if (idNumber && !this.ehrForm.get('dob')?.value) {
    const extractedDob = this.transformSaIdToDateOfBirth(idNumber);
    this.ehrForm.get('dob')?.setValue(extractedDob);
  }
    
    // Check prescription form if visible
    if (this.showPrescription && this.prescriptionForm.invalid) {
      Object.keys(this.prescriptionForm.controls).forEach(key => {
        this.prescriptionForm.get(key)?.markAsTouched();
      });
      this.presentToast('Please complete the prescription form correctly.', 'danger');
      return;
    }

    this.loading = true;
    
    // Generate a patient ID
    const patientId = CustomIdUtil.generatePatientId();
    
    // Prepare form data
    const formValue = this.ehrForm.value;
    
    // Prepare EHR object
    const ehrData: Partial<EHR> = {
      patientId: patientId,
      name: formValue.name,
      surname: formValue.surname,
      email: formValue.email,
      saIdNumber: formValue.saIdNumber,
      dob: new Date(formValue.dob),
      gender: formValue.gender,
      contactNumber: formValue.contactNumber,
      
      // Only include address if street is provided
      address: formValue.street ? {
        street: formValue.street,
        city: formValue.city,
        province: formValue.province,
        postalCode: formValue.postalCode,
        country: formValue.country
      } : undefined,
      
      // Only include next of kin if name is provided
      nextOfKin: formValue.kinName ? {
        name: formValue.kinName,
        relationship: formValue.kinRelationship,
        contactNumber: formValue.kinContactNumber,
        address: {
          street: '',
          city: '',
          province: '',
          postalCode: '',
          country: ''
        }
      } : undefined,
      
      // Parse comma-separated codes into arrays
      icd10DiagnosisCodes: formValue.icd10Codes ? formValue.icd10Codes.split(',').map((code: string) => code.trim()) : [],
      snomedCodes: formValue.snomedCodes ? formValue.snomedCodes.split(',').map((code: string) => code.trim()) : [],
      
      // Initialize empty arrays for lab and radiology results
      labResults: [],
      radiologyResults: []
    };
    
    // Add medical history if enabled
    if (this.showMedicalHistory && this.currentFacilityId && this.currentUserId) {
      const medicalHistoryValue = this.medicalHistoryForm.value;
      
      const medicalHistory: MedicalHistory = {
        id: this.generateId(),
        patientId: patientId,
        facilityId: this.currentFacilityId,
        conditions: medicalHistoryValue.conditions || [],
        surgeries: medicalHistoryValue.surgeries || [],
        allergies: medicalHistoryValue.allergies || [],
        immunizations: medicalHistoryValue.immunizations || [],
        familyHistory: medicalHistoryValue.familyHistory || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.currentUserId,
        lastUpdatedBy: this.currentUserId
      };
      
      ehrData.medicalHistory = medicalHistory;
    }
    
    // Add prescription if enabled
    if (this.showPrescription && this.currentFacilityId && this.currentUserId) {
      const prescriptionValue = this.prescriptionForm.value;
      
      // Get the staffId from the current user if it's a staff member
      const staffId = this.currentStaffId || this.currentUserId;
      
      const prescription: Prescription = {
        prescriptionId: this.generateId(),
        patientId: patientId,
        staffId: staffId,
        doctorId: this.currentUserId,
        facilityId: this.currentFacilityId,
        medication: prescriptionValue.medication,
        dosage: prescriptionValue.dosage,
        duration: prescriptionValue.duration,
        issuedAt: new Date()
      };
      
      ehrData.prescriptions = [prescription];
    }
    
    // Save EHR to Firestore
    this.ehrService.addEhr(ehrData).subscribe({
      next: (ehrId) => {
        this.loading = false;
        this.presentToast('EHR record created successfully', 'success');
        this.router.navigate(['/ehr', ehrId]);
      },
      error: (error) => {
        this.loading = false;
        this.presentToast(`Error: ${error.message}`, 'danger');
      }
    });
  }
  
  // Helper method to generate IDs
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color
    });
    toast.present();
  }


  async openICD10Modal() {
      const modal = await this.modalCtrl.create({
        component: ICD10SelectionModalComponent,
        cssClass: 'icd10-modal'
      });
    
      modal.present();
    
      const { data } = await modal.onWillDismiss();
      if (data) {
        
        this.selectedICDCodes = data;
  
  
        console.log('Selected code:', data);
      }
    }
  
    removeCode(code: IICD10Code) {
      this.selectedICDCodes = this.selectedICDCodes.filter((c: any ) => c.code !== code.code);
    }

    getCategoryColor(category: string): string {
      const colorMap: { [key: string]: string } = {
        'Endocrine': 'primary',
        'Circulatory': 'danger',
        'Respiratory': 'warning',
        'Musculoskeletal': 'tertiary',
        'Mental': 'secondary',
        'Digestive': 'success',
        'Nervous': 'medium',
        'Genitourinary': 'tertiary',
        'Symptoms': 'warning',
        'Skin': 'success',
        'Infectious': 'danger'
      };
      return colorMap[category] || 'medium';
    }
  
    getCategoryIcon(category: string): string {
      const iconMap: { [key: string]: string } = {
        'Endocrine': 'fitness-outline',
        'Circulatory': 'heart-outline',
        'Respiratory': 'leaf-outline',
        'Musculoskeletal': 'body-outline',
        'Mental': 'brain-outline',
        'Digestive': 'nutrition-outline',
        'Nervous': 'flash-outline',
        'Genitourinary': 'water-outline',
        'Symptoms': 'warning-outline',
        'Skin': 'bandage-outline',
        'Infectious': 'bug-outline'
      };
      return iconMap[category] || 'medical-outline';
    }
  }
