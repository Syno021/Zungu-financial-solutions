import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DiagnosesPageRoutingModule } from './diagnoses-routing.module';
import { DiagnosesPage } from './diagnoses.page';
import { PipesModule } from '../../shared/pipes/pipes.module'; // ✅ Import PipesModule

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    DiagnosesPageRoutingModule,
    PipesModule // ✅ This will provide FirestoreDatePipe
  ],
  declarations: [DiagnosesPage], // ❌ FirestoreDatePipe removed
  providers: [DatePipe]
})
export class DiagnosesPageModule {}
