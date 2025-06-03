import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalAddDiagnosesPage } from './modal-add-daignoses.page';

const routes: Routes = [
  {
    path: '',
    component: ModalAddDiagnosesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalAddDaignosesPageRoutingModule {}
