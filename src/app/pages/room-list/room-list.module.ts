import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RoomListPageRoutingModule } from './room-list-routing.module';

import { RoomListPage } from './room-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoomListPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [RoomListPage]
})
export class RoomListPageModule {}
