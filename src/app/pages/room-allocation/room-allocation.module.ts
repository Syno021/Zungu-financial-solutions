import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RoomAllocationPageRoutingModule } from './room-allocation-routing.module';

import { RoomAllocationPage } from './room-allocation.page';
import { RoomAllocationService } from 'src/app/services/room-allocation.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoomAllocationPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [RoomAllocationPage],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  providers: [RoomAllocationService]
})
export class RoomAllocationPageModule {}
