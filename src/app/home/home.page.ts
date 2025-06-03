import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

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
    private authService: AuthService,
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
  
  async login() {
    if (this.loginForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Logging in...',
      spinner: 'circular'
    });
    await loading.present();
    this.isLoading = true;
    
    const { email, password, rememberMe } = this.loginForm.value;
    
    this.authService.login(email, password).subscribe({
      next: (user) => {
        loading.dismiss();
        this.isLoading = false;
        
        // Save in localStorage if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Navigate based on user type
        if (user.type === 'facility' || user.type === 'staff') {
          this.router.navigate(['/dashboard']);
        } else if (user.type === 'patient') {
          this.router.navigate(['/portal-patient']);
        }
        
        this.closeLoginCard();
      },
      error: async (error) => {
        loading.dismiss();
        this.isLoading = false;
        
        const alert = await this.alertController.create({
          header: 'Login Failed',
          message: error.message || 'Please check your credentials and try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }
  
  async resetPassword() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.get('email')?.markAsTouched();
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Sending reset link...',
      spinner: 'circular'
    });
    await loading.present();
    
    const { email } = this.resetPasswordForm.value;
    
    this.authService.resetPassword(email).subscribe({
      next: async () => {
        loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Password Reset',
          message: 'A password reset link has been sent to your email address.',
          buttons: ['OK']
        });
        await alert.present();
        
        this.showResetCard = false;
      },
      error: async (error) => {
        loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Reset Failed',
          message: error.message || 'Failed to send reset link. Please try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
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