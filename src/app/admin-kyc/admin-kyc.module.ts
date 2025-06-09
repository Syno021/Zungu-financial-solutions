import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminKycPageRoutingModule } from './admin-kyc-routing.module';

import { AdminKycPage } from './admin-kyc.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminKycPageRoutingModule
  ],
  declarations: [AdminKycPage]
})
export class AdminKycPageModule {}
