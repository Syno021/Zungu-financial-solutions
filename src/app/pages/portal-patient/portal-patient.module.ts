import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PortalPatientPageRoutingModule } from './portal-patient-routing.module';

import { PortalPatientPage } from './portal-patient.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PortalPatientPageRoutingModule
  ],
  declarations: [PortalPatientPage]
})
export class PortalPatientPageModule {}
