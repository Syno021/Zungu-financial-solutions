import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoomListPage } from './room-list.page';

const routes: Routes = [
  {
    path: '',
    component: RoomListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoomListPageRoutingModule {}
