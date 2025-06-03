import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EhrPage } from './ehr.page';

const routes: Routes = [
  {
    path: '',
    component: EhrPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EhrPageRoutingModule {}
