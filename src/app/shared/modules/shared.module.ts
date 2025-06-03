// src/app/shared/modules/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FirestoreDatePipe } from '../pipes/firestore-date.pipe';

@NgModule({
  declarations: [
    FirestoreDatePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FirestoreDatePipe
  ],
  providers: [
    DatePipe  // Required for FirestoreDatePipe
  ]
})
export class SharedModule { }