import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EhrDetailModalPage } from './ehr-detail-modal.page';

const routes: Routes = [
  {
    path: '',
    component: EhrDetailModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EhrDetailModalPageRoutingModule {}
