import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FacilitiesPage } from './facilities.page';

const routes: Routes = [
  {
    path: '',
    component: FacilitiesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacilitiesPageRoutingModule {}
