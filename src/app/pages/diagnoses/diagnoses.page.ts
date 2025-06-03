import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { EhrService } from '../../services/ehr.service';
import { AuthService } from '../../services/auth.service';
import { EHR } from '../../shared/models/ehr.model';
import { ModalController } from '@ionic/angular';
import { EhrDetailModalPage } from '../ehr-detail-modal/ehr-detail-modal.page';
import { DiagnosesService } from '../../services/diagnosis.service';
import { ModalAddDiagnosesPage } from '../modal-add-daignoses/modal-add-daignoses.page';
import { DateUtils } from '../../shared/utils/date-utils';

@Component({
  selector: 'app-diagnoses',
  templateUrl: './diagnoses.page.html',
  styleUrls: ['./diagnoses.page.scss'],
})
export class DiagnosesPage implements OnInit {
  facilityEhrs$!: Observable<EHR[]>;
  allEhrs: EHR[] = [];
  loading = true;
  error: string | null = null;
  patientId: string = '';
  searchPerformed = false;
  
  constructor(
    private ehrService: EhrService,
    private authService: AuthService,
    private modalController: ModalController,
    private diagnosesService: DiagnosesService
  ) { }
  
  ngOnInit() {
    this.loadFacilityEhrs();
  }
  
  loadFacilityEhrs() {
    this.loading = true;
    this.error = null;
    
    this.ehrService.getEhrsForCurrentFacility().pipe(
      map(ehrs => {
        // Double check that all dates are properly converted
        return ehrs.map(ehr => DateUtils.convertTimestamps(ehr));
      })
    ).subscribe({
      next: (ehrs) => {
        this.loading = false;
        this.allEhrs = ehrs;
        this.filterByPatientId();
      },
      error: (err) => {
        this.error = `Failed to load EHRs: ${err.message}`;
        this.loading = false;
        console.error('Error loading EHRs:', err);
      }
    });
  }
  
  filterByPatientId() {
    if (!this.patientId || this.patientId.trim() === '') {
      // If patientId is empty and no search performed yet, show no records
      if (!this.searchPerformed) {
        this.facilityEhrs$ = of([]);
      } else {
        // If search was performed but then cleared, show all records
        this.facilityEhrs$ = of(this.allEhrs);
      }
    } else {
      // Filter by patientId and mark that a search was performed
      this.searchPerformed = true;
      this.facilityEhrs$ = of(
        this.allEhrs.filter(ehr => 
          ehr.patientId.toLowerCase().includes(this.patientId.toLowerCase())
        )
      );
    }
  }
  
  async viewEhrDetails(ehr: EHR) {
    const modal = await this.modalController.create({
      component: EhrDetailModalPage,
      componentProps: {
        ehr: ehr
      },
      cssClass: 'ehr-detail-modal'
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data && data.refresh) {
      this.loadFacilityEhrs();
    }
  }
  
  async addDiagnoses(ehr: EHR) {
    // Make sure we're working with properly converted dates
    const ehrWithDates = DateUtils.convertTimestamps(ehr);
    
    const modal = await this.modalController.create({
      component: ModalAddDiagnosesPage,
      componentProps: {
        ehr: ehrWithDates
      },
      cssClass: 'add-diagnoses-modal'
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data && data.refresh) {
      this.loadFacilityEhrs();
    }
  }
}