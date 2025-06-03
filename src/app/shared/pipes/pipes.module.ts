import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreDatePipe } from './firestore-date.pipe';

@NgModule({
  declarations: [FirestoreDatePipe], // ✅ Declare the pipe only here
  imports: [CommonModule],
  exports: [FirestoreDatePipe] // ✅ Export it so other modules can use it
})
export class PipesModule {}
