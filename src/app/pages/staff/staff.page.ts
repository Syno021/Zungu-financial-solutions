import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AppointmentStatus, AppointmentType, IAppointment } from 'src/app/shared/models/appointements';
import { map } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';

interface Staff {
  id?: string;
  staffId: string;
  email: string;
  // other staff fields if needed
}

interface Appointment {
  id?: string;
  patient:{
    firstName : String;
    lastName : String;
  }
  dateTime: any; // Changed to any to handle both string and Timestamp
  time: string;
  practitioner: {
    id: string;
    // other practitioner fields if needed
  };
  status: string;
  // Add any other appointment fields you have
}

interface Prescription {
  id?: string;
  patientName: string;
  medication: string;
  dosage: string;
  instructions: string;
  staffId: string;
  issuedAt: any; // Changed to any to handle both string and Timestamp
  // Add any other prescription fields you have
}

interface LabResult {
  id?: string;
  patientName: string;
  testName: string;
  result: string;
  referenceRange: string;
  staffId: string;
  issuedAt: any; // To handle both string and Timestamp
  // Add any other lab result fields you have
}

interface RadiologyResult {
  id?: string;
  patientName: string;
  procedureName: string;
  findings: string;
  impression: string;
  staffId: string;
  issuedAt: any; // To handle both string and Timestamp
  // Add any other radiology result fields you have
}

@Component({
  selector: 'app-staff',
  templateUrl: './staff.page.html',
  styleUrls: ['./staff.page.scss'],
})
export class StaffPage implements OnInit {
  appointments: Appointment[] = [];
  prescriptions: Prescription[] = [];
  labResults: LabResult[] = [];
  radiologyResults: RadiologyResult[] = [];
  userEmail: string = '';
  staffId: string = '';
  showAppointments: boolean = false;
  showPrescriptions: boolean = false;
  showLabResults: boolean = false;
  showRadiologyResults: boolean = false;
  isLoading: boolean = true;
  
  // Status options from AppointmentStatus enum
  statusOptions: string[] = Object.values(AppointmentStatus);

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.auth.authState.subscribe(user => {
      if (user) {
        this.userEmail = user.email || '';
        console.log('User email:', this.userEmail);
        this.getStaffId();
      } else {
        console.log('No user is logged in');
        this.isLoading = false;
      }
    });
  }

  getStaffId() {
    this.firestore.collection<Staff>('staff', ref => 
      ref.where('email', '==', this.userEmail)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const staffData = snapshot.docs[0].data();
        this.staffId = staffData.staffId;
        console.log('Retrieved staffId:', this.staffId);
        this.fetchAppointments();
        this.fetchPrescriptions();
        this.fetchLabResults();
        this.fetchRadiologyResults();
      } else {
        console.log('No staff found with email:', this.userEmail);
        this.isLoading = false;
      }
    }, error => {
      console.error('Error fetching staff data:', error);
      this.isLoading = false;
    });
  }

  fetchAppointments() {
    this.firestore.collection<Appointment>('appointments', ref => 
      ref.where('practitioner.id', '==', this.staffId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Appointment;
        const docId = a.payload.doc.id;
        return { ...data, id: docId };
      }))
    ).subscribe(appointments => {
      console.log('Appointments found:', appointments.length);
      this.appointments = this.formatAppointmentDates(appointments);
      this.isLoading = false;
      if (appointments.length > 0) {
        this.showAppointments = true;
      }
    }, error => {
      console.error('Error fetching appointments:', error);
      this.isLoading = false;
    });
  }

  fetchPrescriptions() {
    this.firestore.collection<Prescription>('prescriptions', ref => 
      ref.where('staffId', '==', this.staffId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Prescription;
        const docId = a.payload.doc.id;
        return { ...data, id: docId };
      }))
    ).subscribe(prescriptions => {
      console.log('Prescriptions found:', prescriptions.length);
      this.prescriptions = this.formatPrescriptionDates(prescriptions);
      this.isLoading = false;
    }, error => {
      console.error('Error fetching prescriptions:', error);
      this.isLoading = false;
    });
  }

  fetchLabResults() {
    this.firestore.collection<LabResult>('labResults', ref => 
      ref.where('staffId', '==', this.staffId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as LabResult;
        const docId = a.payload.doc.id;
        return { ...data, id: docId };
      }))
    ).subscribe(labResults => {
      console.log('Lab results found:', labResults.length);
      this.labResults = this.formatLabResultDates(labResults);
      this.isLoading = false;
    }, error => {
      console.error('Error fetching lab results:', error);
      this.isLoading = false;
    });
  }

  fetchRadiologyResults() {
    this.firestore.collection<RadiologyResult>('radiologyResults', ref => 
      ref.where('staffId', '==', this.staffId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as RadiologyResult;
        const docId = a.payload.doc.id;
        return { ...data, id: docId };
      }))
    ).subscribe(radiologyResults => {
      console.log('Radiology results found:', radiologyResults.length);
      this.radiologyResults = this.formatRadiologyResultDates(radiologyResults);
      this.isLoading = false;
    }, error => {
      console.error('Error fetching radiology results:', error);
      this.isLoading = false;
    });
  }

  // Format appointment dates
  formatAppointmentDates(appointments: Appointment[]): Appointment[] {
    return appointments.map(appointment => {
      const formattedAppointment = { ...appointment };
      
      // Format dateTime if it's a Firestore Timestamp
      if (appointment.dateTime && typeof appointment.dateTime !== 'string') {
        // Check if it has toDate method (Firestore Timestamp)
        if (appointment.dateTime.toDate) {
          const date = appointment.dateTime.toDate();
          formattedAppointment.dateTime = this.formatDate(date);
        }
      }
      
      return formattedAppointment;
    });
  }

  // Format prescription dates
  formatPrescriptionDates(prescriptions: Prescription[]): Prescription[] {
    return prescriptions.map(prescription => {
      const formattedPrescription = { ...prescription };
      
      // Format date if it's a Firestore Timestamp
      if (prescription.issuedAt && typeof prescription.issuedAt !== 'string') {
        // Check if it has toDate method (Firestore Timestamp)
        if (prescription.issuedAt.toDate) {
          const date = prescription.issuedAt.toDate();
          formattedPrescription.issuedAt = this.formatDate(date);
        }
      }
      
      return formattedPrescription;
    });
  }

  // Format lab result dates
  formatLabResultDates(labResults: LabResult[]): LabResult[] {
    return labResults.map(labResult => {
      const formattedLabResult = { ...labResult };
      
      // Format date if it's a Firestore Timestamp
      if (labResult.issuedAt && typeof labResult.issuedAt !== 'string') {
        // Check if it has toDate method (Firestore Timestamp)
        if (labResult.issuedAt.toDate) {
          const date = labResult.issuedAt.toDate();
          formattedLabResult.issuedAt = this.formatDate(date);
        }
      }
      
      return formattedLabResult;
    });
  }

  // Format radiology result dates
  formatRadiologyResultDates(radiologyResults: RadiologyResult[]): RadiologyResult[] {
    return radiologyResults.map(radiologyResult => {
      const formattedRadiologyResult = { ...radiologyResult };
      
      // Format date if it's a Firestore Timestamp
      if (radiologyResult.issuedAt && typeof radiologyResult.issuedAt !== 'string') {
        // Check if it has toDate method (Firestore Timestamp)
        if (radiologyResult.issuedAt.toDate) {
          const date = radiologyResult.issuedAt.toDate();
          formattedRadiologyResult.issuedAt = this.formatDate(date);
        }
      }
      
      return formattedRadiologyResult;
    });
  }

  // Helper method to format dates consistently
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleAppointments() {
    this.showAppointments = !this.showAppointments;
  }

  togglePrescriptions() {
    this.showPrescriptions = !this.showPrescriptions;
  }

  toggleLabResults() {
    this.showLabResults = !this.showLabResults;
  }

  toggleRadiologyResults() {
    this.showRadiologyResults = !this.showRadiologyResults;
  }

  // Method to open status update alert
  async updateAppointmentStatus(appointment: Appointment) {
    const alert = await this.alertController.create({
      header: 'Update Status',
      subHeader: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      inputs: this.statusOptions.map(status => ({
        name: status,
        type: 'radio',
        label: status,
        value: status,
        checked: appointment.status === status
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: (selectedStatus: AppointmentStatus) => {
            if (selectedStatus) {
              this.saveAppointmentStatus(appointment.id!, selectedStatus);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Method to save the updated status to Firestore
  saveAppointmentStatus(appointmentId: string, newStatus: AppointmentStatus) {
    this.firestore.collection('appointments').doc(appointmentId).update({
      status: newStatus
    })
    .then(() => {
      console.log('Appointment status updated successfully');
      // No need to manually refresh the list, as the snapshotChanges subscription will update automatically
    })
    .catch(error => {
      console.error('Error updating appointment status:', error);
    });
  }
}