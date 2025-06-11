import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MyLoansPage } from './my-loans.page';

const routes: Routes = [
  {
    path: '',
    component: MyLoansPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MyLoansPageRoutingModule {}
