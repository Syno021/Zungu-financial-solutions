import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddEhrPage } from './add-ehr.page';

const routes: Routes = [
  {
    path: '',
    component: AddEhrPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddEhrPageRoutingModule {}
