import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DiagnosesPage } from './diagnoses.page';

const routes: Routes = [
  {
    path: '',
    component: DiagnosesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DiagnosesPageRoutingModule {}
