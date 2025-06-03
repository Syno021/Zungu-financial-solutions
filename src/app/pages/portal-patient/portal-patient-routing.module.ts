import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PortalPatientPage } from './portal-patient.page';

const routes: Routes = [
  {
    path: '',
    component: PortalPatientPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PortalPatientPageRoutingModule {}
