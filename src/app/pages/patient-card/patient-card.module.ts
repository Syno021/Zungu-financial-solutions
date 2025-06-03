import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatientCardPageRoutingModule } from './patient-card-routing.module';

import { PatientCardPage } from './patient-card.page';
import { TimestampDatePipe } from '../../shared/pipes/timestamp-date.pipe';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatientCardPageRoutingModule
  ],
  exports: [
    TimestampDatePipe
  ],
  declarations: [PatientCardPage,TimestampDatePipe]
})
export class PatientCardPageModule {}
