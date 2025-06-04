import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminLoanManagementPageRoutingModule } from './admin-loan-management-routing.module';

import { AdminLoanManagementPage } from './admin-loan-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminLoanManagementPageRoutingModule
  ],
  declarations: [AdminLoanManagementPage]
})
export class AdminLoanManagementPageModule {}
