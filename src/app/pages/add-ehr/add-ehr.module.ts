import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddEhrPageRoutingModule } from './add-ehr-routing.module';

import { AddEhrPage } from './add-ehr.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AddEhrPageRoutingModule
  ],
  declarations: [AddEhrPage]
})
export class AddEhrPageModule {}
