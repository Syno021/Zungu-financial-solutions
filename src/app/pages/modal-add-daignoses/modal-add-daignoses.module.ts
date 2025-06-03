import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModalAddDaignosesPageRoutingModule } from './modal-add-daignoses-routing.module';
import { ModalAddDiagnosesPage } from './modal-add-daignoses.page';
import { PipesModule } from '../../shared/pipes/pipes.module'; // ✅ Import PipesModule

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ModalAddDaignosesPageRoutingModule,
    PipesModule // ✅ This will provide FirestoreDatePipe
  ],
  declarations: [ModalAddDiagnosesPage], // ❌ FirestoreDatePipe removed
  providers: [DatePipe]
})
export class ModalAddDaignosesPageModule {}
