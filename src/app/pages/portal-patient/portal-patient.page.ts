import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Patient } from 'src/app/shared/models/patient.model';
import { Facility } from 'src/app/shared/models/facility.model';
import { EHR } from 'src/app/shared/models/ehr.model';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { PatientsPage } from '../patients/patients.page'; // Import the modal component
import { firstValueFrom } from 'rxjs';
import { QRGeneratorUtils } from 'src/app/shared/utils/qr-generator.utils';
@Component({
  selector: 'app-portal-patient',
  templateUrl: './portal-patient.page.html',
  styleUrls: ['./portal-patient.page.scss'],
})
export class PortalPatientPage implements OnInit {
  patient: Patient | null = null;
  facility: Facility | null = null;
  loading = true;
  error: string | null = null;
  patientEhr$: Observable<EHR | null> | null = null;
  constructor(
    private authService: AuthService,
    private firestore: AngularFirestore,
    private loadingController: LoadingController,
    private modalController: ModalController ,// Add ModalController
    private alertController: AlertController
  ) { }

  
  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Loading your information...',
      spinner: 'circular'
    });
    await loading.present();

    // Get the current authenticated user
    this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user || user.type !== 'patient') {
          this.error = 'Not authenticated as a patient';
          return of(null);
        }
        
        // Store patient data
        this.patient = user.data as Patient;
        
        // Fetch the facility information using facilityId from patient
        return this.firestore.doc<Facility>(`facilities/${this.patient.facilityId}`).valueChanges();
      })
    ).subscribe({
      next: (facilityData) => {
        loading.dismiss();
        this.loading = false;
        
        if (facilityData) {
          this.facility = facilityData;
        }
      },
      error: (err) => {
        loading.dismiss();
        this.loading = false;
        this.error = 'Error loading data: ' + err.message;
        console.error('Error fetching patient or facility data:', err);
      }
    });

    this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user || user.type !== 'patient') {
          return of(null);
        }
        
        this.patient = user.data as Patient;
        // Create an observable to fetch the patient's EHR
        return this.firestore.doc<EHR>(`ehrs/${this.patient.patientId}`).valueChanges();
      })
    ).subscribe();
  }

  // Helper method to format timestamp to date string
  formatDate(date: any): string {
    if (!date) return 'N/A';
    
    // Handle both Timestamp and Date objects
    if (date.toDate) {
      // Firebase Timestamp
      return date.toDate().toLocaleDateString();
    } else if (date instanceof Date) {
      // JavaScript Date
      return date.toLocaleDateString();
    }
    
    return 'N/A';
  }

  async viewMyEhrRecords() {
    if (!this.patient) {
      await this.presentAlert('Error', 'Patient information not available.');
      return;
    }
    
    // Create a non-nullable reference to the patient for TypeScript
    const patient = this.patient;
    
    const loading = await this.loadingController.create({
      message: 'Loading your health records...',
      spinner: 'circular'
    });
    await loading.present();
    
    try {
      const ehrSnapshotResult = await this.firestore
        .collection<EHR>('ehrs', ref => 
          ref.where('patientId', '==', patient.patientId)
        )
        .get()
        .toPromise();
      
      await loading.dismiss();
      
      // Check that we have a result before accessing properties
      if (ehrSnapshotResult && !ehrSnapshotResult.empty) {
        const ehrDoc = ehrSnapshotResult.docs[0];
        const ehr = ehrDoc.data() as EHR;
        
        const modal = await this.modalController.create({
          component: PatientsPage,
          componentProps: {
            ehr: ehr
          },
          cssClass: 'ehr-detail-modal'
        });
        
        await modal.present();
        
        const { data } = await modal.onDidDismiss();
      } else {
        await this.presentAlert('No Records Found', 'No electronic health records found for your account.');
      }
    } catch (error) {
      console.error('Error fetching EHR:', error);
      await loading.dismiss();
      await this.presentAlert('Error', 'Failed to load your health records. Please try again later.');
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

}