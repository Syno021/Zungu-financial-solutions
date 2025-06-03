import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatientsPageRoutingModule } from './patients-routing.module';

import { PatientsPage } from './patients.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PatientsPageRoutingModule
  ],
  declarations: [PatientsPage]
})
export class PatientsPageModule {}
