import { Component, OnInit } from '@angular/core';
import { LoadingController, NavController } from '@ionic/angular';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PatientService } from 'src/app/services/patient.service';
import { AuthService } from 'src/app/services/auth.service';
import { QRGeneratorUtils } from 'src/app/shared/utils/qr-generator.utils';
import { encrypt } from 'src/app/shared/utils/encryption.util';
import { filter } from 'rxjs';
import { Staff } from 'src/app/shared/models/staff.model';
import { Facility } from 'src/app/shared/models/facility.model';
import { DateUtils } from '../../shared/utils/date-utils';

@Component({
  selector: 'app-patient-card',
  templateUrl: './patient-card.page.html',
  styleUrls: ['./patient-card.page.scss'],
})
export class PatientCardPage implements OnInit {
  patients: any[] = [];
  filteredPatients: any[] = [];
  currentFacilityId: string = '';
  selectAll: boolean = false;
  searchId: string = '';
  searchName: string = '';
  authSubscription: any;
  DateUtils = DateUtils;
  currentFacilityName: any = 'Loading facility...';
  
    constructor(
       private navCtrl: NavController,
      private patientService: PatientService,
      private authService: AuthService,
      private loadingCtrl: LoadingController
    ) {}
  
    async ngOnInit() {
      const loading = await this.loadingCtrl.create({
        message: 'Loading patients...'
      });
      await loading.present();
       // Subscribe to auth service to get current user and facility ID
          this.authSubscription = this.authService.currentUser$
            .pipe(
              filter(user => !!user) // Only proceed if we have a user
            )
            .subscribe(async user => {
              if (user) {
                console.log('Current user type:', user.type);
                
                if (user.type === 'patient') {
                  console.log('Patient attempted to access inventory page');
                  // Log out patient from this page and redirect to home or login page
                  this.logoutPatient();
                  await loading.dismiss();
                  return; // Stop further execution
                }
                
                if (user.type === 'facility') {
                  const facility = user.data as Facility;
                  console.log(facility);
                  this.currentFacilityId = facility.facilityId;
                  console.log('Facility ID detected:', this.currentFacilityId);
                } else if (user.type === 'staff') {
                  const staff = user.data as Staff;
                  this.currentFacilityId = staff.facilityId;
                  console.log('Staff facility ID detected:', this.currentFacilityId);
                }
                // Load inventory after we have the facility ID
                this.currentFacilityName = await this.patientService.getFacilityName(this.currentFacilityId);
                await this.loadPatients();
                await loading.dismiss();
              } else {
                console.log('No authenticated user found');
              }
            });
    
    }
  
    async loadPatients() {
      try {
        this.patients = await this.patientService.getPatientsByFacility(this.currentFacilityId);
        console.log("patients: ", this.patients );
        // Generate QR codes and format data
        await Promise.all(this.patients.map(async (patient) => {
          console.log("idNumber: ", patient.saIdNumber );
          const encryptedId :any = encrypt(patient.saIdNumber);
          patient.qrData = await QRGeneratorUtils.generateQRDataURL(encryptedId, {
            width: 150,
            color: { dark: '#1a237e', light: '#ffffff' }
          });
          patient.formattedDob = new Date(patient.dateOfBirth).toLocaleDateString();
        }));
        this.filteredPatients = [...this.patients];
      } catch (error) {
        console.error('Error loading patients:', error);
      } 
    }
  
    toggleSelectAll() {
      this.filteredPatients.forEach(patient => patient.selected = this.selectAll);
    }
  
    get selectedPatients() {
      return this.filteredPatients.filter(patient => patient.selected);
    }
  
    filterPatients() {
      this.filteredPatients = this.patients.filter(patient => {
        const idMatch = patient.idNumber.toLowerCase().includes(this.searchId.toLowerCase());
        const nameMatch = `${patient.name} ${patient.surname}`.toLowerCase().includes(this.searchName.toLowerCase());
        return idMatch && nameMatch;
      });
      this.selectAll = false;
    }
  
  
    async downloadPDF() {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (const patient of this.patients) {
        const cardElement = document.getElementById(`card-${patient.id}`);
        if (cardElement) {
          const canvas = await html2canvas(cardElement);
          const imgData = canvas.toDataURL('image/png');
          
          const imgWidth = 85; // mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
          pdf.addPage();
        }
      }
  
      pdf.deletePage(pdf.getNumberOfPages()); // Remove last blank page
      pdf.save('patient-cards.pdf');
    }


      // New method to handle patient logout
  async logoutPatient() {
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Redirecting...',
        duration: 1000
      });
      await loading.present();
      
      // Navigate away from the inventory page (redirect to home or login)
      this.navCtrl.navigateRoot('/home'); // or '/login' depending on your app structure
      
      // Optionally display a message about restricted access
      // This would require a toast controller or alert controller to be injected
    } catch (error) {
      console.error('Error during patient redirect:', error);
    }
  }
  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }


  }


