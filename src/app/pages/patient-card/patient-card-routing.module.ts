import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PatientCardPage } from './patient-card.page';

const routes: Routes = [
  {
    path: '',
    component: PatientCardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientCardPageRoutingModule {}
