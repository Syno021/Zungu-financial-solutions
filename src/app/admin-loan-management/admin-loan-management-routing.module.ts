import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminLoanManagementPage } from './admin-loan-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminLoanManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminLoanManagementPageRoutingModule {}
