import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoomAllocationPage } from './room-allocation.page';

const routes: Routes = [
  {
    path: '',
    component: RoomAllocationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoomAllocationPageRoutingModule {}
