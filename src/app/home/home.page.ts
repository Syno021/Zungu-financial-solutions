import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
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
    private alertController: AlertController,
    private afAuth: AngularFireAuth
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
  
  async onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        const { email, password, rememberMe } = this.loginForm.value;
        
        // Remember email if checkbox is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        await this.afAuth.signInWithEmailAndPassword(email, password);
        this.closeLoginCard();
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        let message = 'Login failed. Please try again.';
        if (error.code === 'auth/user-not-found') {
          message = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
          message = 'Incorrect password.';
        }
        this.showError('Login Failed', message);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  async onResetPassword() {
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      try {
        const { email } = this.resetPasswordForm.value;
        await this.afAuth.sendPasswordResetEmail(email);
        this.showSuccess('Password Reset Email Sent', 
          'Please check your email for instructions to reset your password.');
        this.toggleResetPassword();
      } catch (error: any) {
        let message = 'Failed to send reset email. Please try again.';
        if (error.code === 'auth/user-not-found') {
          message = 'No account found with this email.';
        }
        this.showError('Reset Failed', message);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.resetPasswordForm.markAllAsTouched();
    }
  }

  private async showError(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showSuccess(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}