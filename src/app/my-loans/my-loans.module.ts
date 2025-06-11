import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MyLoansPageRoutingModule } from './my-loans-routing.module';

import { MyLoansPage } from './my-loans.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MyLoansPageRoutingModule
  ],
  declarations: [MyLoansPage]
})
export class MyLoansPageModule {}
