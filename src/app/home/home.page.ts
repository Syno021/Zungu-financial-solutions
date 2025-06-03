import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss','home2.page.scss','home3.page.scss'],
})
export class HomePage {
  showLoginCard = false;
  loginForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  showResetCard = false;
  selectedUserType = 'facility'; // Default selected user type
  isLoading = false;
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    this.createForms();
  }
  
  createForms() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
    
    this.resetPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  toggleLoginCard() {
    this.showLoginCard = !this.showLoginCard;
    if (this.showResetCard) {
      this.showResetCard = false;
    }
  }
  
  closeLoginCard() {
    this.showLoginCard = false;
    this.showResetCard = false;
    this.loginForm.reset();
    this.resetPasswordForm.reset();
  }
  
  selectUserType(type: 'facility' | 'caregiver' | 'patient') {
    this.selectedUserType = type;
  }
  
  toggleResetPassword() {
    this.showResetCard = !this.showResetCard;
    // If email was already entered in login form, copy it to reset form
    if (this.loginForm.get('email')?.valid) {
      this.resetPasswordForm.get('email')?.setValue(this.loginForm.get('email')?.value);
    }
  }
  
  // Check if we have a remembered email on initialization
  ngOnInit() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.loginForm.get('email')?.setValue(rememberedEmail);
      this.loginForm.get('rememberMe')?.setValue(true);
    }
  }
  
  // Getters for easy form validation in template
  get emailControl() { return this.loginForm.get('email'); }
  get passwordControl() { return this.loginForm.get('password'); }
  get resetEmailControl() { return this.resetPasswordForm.get('email'); }
}