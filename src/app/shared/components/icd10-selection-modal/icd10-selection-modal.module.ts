import { CUSTOM_ELEMENTS_SCHEMA,NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';  // Import IonicModule here
import { ICD10SelectionModalComponent } from './icd10-selection-modal.component';  // Import the component


@NgModule({
  declarations: [ ICD10SelectionModalComponent],
  imports: [
       CommonModule,
        IonicModule,
   // Import IonicModule to use Ionic components like ion-card, ion-button, ion-infinite-scroll, etc.
  ],
  exports: [ICD10SelectionModalComponent],  // Export the component if needed in other modules
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})
export class ICD10SelectionModalModule {}
