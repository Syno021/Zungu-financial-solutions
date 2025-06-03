import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EhrService } from '../../services/ehr.service';
import { EHR } from '../../shared/models/ehr.model';
import { ModalController } from '@ionic/angular';
import { EhrDetailModalPage } from '../ehr-detail-modal/ehr-detail-modal.page';
import { DateUtils } from '../../shared/utils/date-utils';
@Component({
  selector: 'app-ehr',
  templateUrl: './ehr.page.html',
  styleUrls: ['./ehr.page.scss'],
})
export class EhrPage implements OnInit {
  facilityEhrs$!: Observable<EHR[]>;
  loading = true;
  error: string | null = null;
  DateUtils = DateUtils;
  constructor(
    private ehrService: EhrService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadFacilityEhrs();
  }

  loadFacilityEhrs() {
    this.loading = true;
    this.error = null;
    
    this.facilityEhrs$ = this.ehrService.getEhrsForCurrentFacility().pipe(
      map((ehrs: EHR[]) => ehrs.map((ehr: EHR) => DateUtils.convertTimestamps(ehr)))
    );
    
    // Subscribe just to handle errors and loading state
    this.facilityEhrs$.subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.error = `Failed to load EHRs: ${err.message}`;
        this.loading = false;
        console.error('Error loading EHRs:', err);
      }
    });
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
}