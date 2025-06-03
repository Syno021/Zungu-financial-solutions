import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { AppointmentStatus, AppointmentType, IAppointment } from 'src/app/shared/models/appointements';
import { Staff } from 'src/app/shared/models/staff.model';
import { Observable } from 'rxjs';
import { emailService } from 'src/app/shared/utils/email-js.util';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
})
export class AppointmentsPage implements OnInit {
  appointmentForm: FormGroup;
  submissionSuccess = false;
  patientData: any = null;
  staffList: Staff[] = [];
  currentUserId: string | null = null;
  minDate: string;
  isSubmitting = false;
  validationMessages: {[key: string]: string} = {};
  patientFacilityId: string | null = null;

  appointmentTypes = Object.values(AppointmentType);
  appointmentStatuses = Object.values(AppointmentStatus);

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
  ) {
    /* Set minimum date to today */
    this.minDate = new Date().toISOString();
    
    this.appointmentForm = this.fb.group({
      appointmentType: ['', [Validators.required]],
      appointmentStatus: ['SCHEDULED', [Validators.required]],
      doctor: ['', [Validators.required]],
      preferredDate: [this.minDate, [Validators.required]],
      preferredTime: [this.minDate, [Validators.required]],
      reason: ['', [Validators.required]],
      medicalHistory: ['']
    });
  }

  async ngOnInit() {
    /* Get the currently logged-in user's info */
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        if (user.email) {
          this.getPatientData(user.email);
        }
      }
    });
  }

  /* Get patient data based on email */
  getPatientData(email: string) {
    this.firestore.collection('Electronic_Health_Record', ref => ref.where('email', '==', email))
      .valueChanges()
      .subscribe(data => {
        if (data.length > 0) {
          this.patientData = data[0];
          console.log('Patient Data:', this.patientData);
          
          /* Extract facility ID from patient data */
          if (this.patientData && this.patientData.facilityId) {
            this.patientFacilityId = this.patientData.facilityId;
            console.log('Patient Facility ID:', this.patientFacilityId);
            
            /* Now that we have the facility ID, load practitioners from the same facility */
            this.getStaffList();
          } else {
            console.warn('Patient has no facility ID assigned.');
            this.showToast('Your account is not associated with any facility. Please contact support.', 'warning');
          }
        } else {
          console.warn('No patient found with this email.');
          this.showToast('Your patient record was not found. Please contact support.', 'warning');
        }
      }, error => {
        console.error('Error fetching patient data:', error);
      });
  }

  /* Fetch staff list from Firebase filtered by facility ID  */
  getStaffList() {
    if (!this.patientFacilityId) {
      this.staffList = [];
      return;
    }
    
    this.firestore.collection<Staff>('staff', ref => 
      ref.where('facilityId', '==', this.patientFacilityId)
    )
    .valueChanges()
    .subscribe(staff => {
      this.staffList = staff;
      console.log('Filtered Staff List by Facility ID:', this.staffList);
      
      if (this.staffList.length === 0) {
        this.showToast('No practitioners available at your facility.', 'warning');
      }
      
      /* If the currently selected doctor is not in the filtered list, reset selection  */
      const currentDoctor = this.appointmentForm.get('doctor')?.value;
      if (currentDoctor && !this.staffList.some(s => s.staffId === currentDoctor)) {
        this.appointmentForm.patchValue({ doctor: '' });
      }
    }, error => {
      console.error('Error fetching staff:', error);
      this.showToast('Error loading practitioner list. Please try again later.', 'danger');
    });
  }

  /* Helper method to show toast messages */
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  /* Check form validation and return specific validation errors  */
  validateForm(): boolean {
    this.validationMessages = {};
    
    if (this.appointmentForm.get('appointmentType')?.invalid) {
      this.validationMessages['appointmentType'] = 'Please select an appointment type';
    }
    
    if (this.appointmentForm.get('doctor')?.invalid) {
      this.validationMessages['doctor'] = 'Please select a doctor';
    }
    
    if (this.appointmentForm.get('preferredDate')?.invalid) {
      this.validationMessages['preferredDate'] = 'Please select a valid date';
    }
    
    if (this.appointmentForm.get('preferredTime')?.invalid) {
      this.validationMessages['preferredTime'] = 'Please select a valid time';
    }
    
    if (this.appointmentForm.get('reason')?.invalid) {
      this.validationMessages['reason'] = 'Please provide a reason for your visit';
    }
    
    /* Mark all fields as touched to trigger the error messages  */
    Object.keys(this.appointmentForm.controls).forEach(key => {
      const control = this.appointmentForm.get(key);
      control?.markAsTouched();
    });
    
    return Object.keys(this.validationMessages).length === 0;
  }

  async submitAppointment() {
    if (!this.validateForm()) {
      const errorFields = Object.keys(this.validationMessages).map(field => {
        const readableField = field.replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
        
        return readableField;
      }).join(', ');
      
      const toast = await this.toastController.create({
        message: `Please complete the following fields: ${errorFields}`,
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      toast.present();
      return;
    }
    
    if (!this.patientData || !this.currentUserId) {
      const toast = await this.toastController.create({
        message: 'Patient information is missing. Please try logging in again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      toast.present();
      return;
    }
    
    this.isSubmitting = true;
    try {
      const formValues = this.appointmentForm.value;
      
      // Combine date and time into a single Date object
      const dateStr = new Date(formValues.preferredDate).toDateString();
      const timeStr = new Date(formValues.preferredTime).toTimeString();
      const appointmentDateTime = new Date(`${dateStr} ${timeStr}`);
      
      // Get practitioner information
      const selectedPractitioner = this.staffList.find(staff => staff.staffId === formValues.doctor);
      
      if (!selectedPractitioner) {
        throw new Error('Selected practitioner information not found');
      }
      
      // Create practitioner map with the required fields
      const practitionerMap = {
        id: selectedPractitioner.staffId,
        email: selectedPractitioner.email,
        facilityId: selectedPractitioner.facilityId || '',
        name: selectedPractitioner.name,
        phone: selectedPractitioner.phone,
        role: selectedPractitioner.role,
        specialization: selectedPractitioner.specialization || ''
      };
      
      // Create patient map with all available patient information
      const patientMap = {
        id: this.currentUserId,
        ...this.patientData
      };
      
      // Create the appointment object
      const appointment: IAppointment = {
        patientId: this.currentUserId,
        practitionerId: formValues.doctor,
        patient: patientMap,
        practitioner: practitionerMap,
        appointmentType: formValues.appointmentType,
        dateTime: appointmentDateTime,
        duration: 30, // Default duration in minutes
        status: formValues.appointmentStatus,
        reason: formValues.reason,
        notes: formValues.medicalHistory || '',
        reminderSent: false
      };
      
      // Save to Firestore
      await this.firestore.collection('appointments').add(appointment);
      
      // Send email notification to the doctor
      if (selectedPractitioner.email) {
        await emailService.sendNotificationEmail({
          email_to: selectedPractitioner.email,
          to_name: `Dr. ${selectedPractitioner.name}`,
          subject: 'New Appointment Scheduled',
          from_name: 'Clinic Appointment System',
          message: `A new appointment has been scheduled with you.

Appointment Details:
- Patient: ${patientMap.firstName} ${patientMap.lastName}
- Date: ${appointmentDateTime.toLocaleDateString()}
- Time: ${appointmentDateTime.toLocaleTimeString()}
- Reason: ${formValues.reason}

Please review the appointment in your system.`,
          patient_name: `${patientMap.firstName} ${patientMap.lastName}`,
          appointment_date: appointmentDateTime.toLocaleDateString(),
          appointment_time: appointmentDateTime.toLocaleTimeString(),
          reason: formValues.reason
        });
      }
      
      this.submissionSuccess = true;

      const toast = await this.toastController.create({
        message: 'Appointment booked successfully!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      toast.present();

      this.appointmentForm.reset({
        appointmentStatus: 'SCHEDULED',
        preferredDate: this.minDate,
        preferredTime: this.minDate
      });
      
      setTimeout(() => {
        this.submissionSuccess = false;
      }, 3000);
      this.isSubmitting = false;
    } catch (error) {
      this.isSubmitting = false;
      console.error('Error saving appointment:', error);
      const toast = await this.toastController.create({
        message: 'Error booking appointment. Please try again.',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      toast.present();
    }
  }
}