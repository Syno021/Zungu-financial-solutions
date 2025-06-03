import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FacilitiesPageRoutingModule } from './facilities-routing.module';

import { FacilitiesPage } from './facilities.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FacilitiesPageRoutingModule
  ],
  declarations: [FacilitiesPage]
})
export class FacilitiesPageModule {}
