import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EhrPageRoutingModule } from './ehr-routing.module';

import { EhrPage } from './ehr.page';
import { PipesModule } from 'src/app/shared/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EhrPageRoutingModule,
    PipesModule
  ],
  declarations: [EhrPage],
  providers: [DatePipe]
})
export class EhrPageModule {}
