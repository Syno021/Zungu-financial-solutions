import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthPage } from './auth.page';
import { AuthPageRoutingModule } from './auth-routing.module';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AuthPageRoutingModule,
    ReactiveFormsModule,
    AuthPage // Add the standalone component here
  ],
  declarations: [] // Remove AuthPage from here
})
export class AuthPageModule { }
