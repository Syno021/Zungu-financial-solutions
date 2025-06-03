import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EhrDetailModalPageRoutingModule } from './ehr-detail-modal-routing.module';

import { EhrDetailModalPage } from './ehr-detail-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EhrDetailModalPageRoutingModule
  ],
  declarations: [EhrDetailModalPage]
})
export class EhrDetailModalPageModule {}
