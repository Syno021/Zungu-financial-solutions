import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { User } from '../shared/models/user.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {

  // Form fields
  name: string = '';
  surname: string = '';
  gender: string = '';
  idNumber: string = '';
  email: string = '';
  phoneNumber: string = '';
  bankAccount: string = '';
  password: string = '';
  confirmPassword: string = '';
  acceptTerms: boolean = false;

  // Loading state
  isLoading: boolean = false;

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {}

  // Form validation
  isFormValid(): boolean {
    return !!(
      this.name.trim() &&
      this.surname.trim() &&
      this.gender &&
      this.idNumber.trim() &&
      this.email.trim() &&
      this.phoneNumber.trim() &&
      this.bankAccount.trim() &&
      this.password &&
      this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.acceptTerms &&
      this.isValidEmail(this.email) &&
      this.isValidPassword(this.password)
    );
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Password validation (minimum 6 characters)
  private isValidPassword(password: string): boolean {
    return password.length >= 6;
  }

  // ID Number validation (South African format - 13 digits)
  private isValidIdNumber(idNumber: string): boolean {
    const idRegex = /^\d{13}$/;
    return idRegex.test(idNumber);
  }

  // Phone number validation
  private isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Show loading spinner
  private async showLoading(message: string = 'Creating account...') {
    const loading = await this.loadingController.create({
      message,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }

  // Show success toast
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }

  // Show error alert
  private async showErrorAlert(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Validate form data
  private validateFormData(): string | null {
    if (!this.isValidEmail(this.email)) {
      return 'Please enter a valid email address.';
    }
    
    if (!this.isValidPassword(this.password)) {
      return 'Password must be at least 6 characters long.';
    }
    
    if (!this.isValidIdNumber(this.idNumber)) {
      return 'Please enter a valid 13-digit ID number.';
    }
    
    if (!this.isValidPhoneNumber(this.phoneNumber)) {
      return 'Please enter a valid phone number.';
    }
    
    return null;
  }

  // Register user
  async registerUser() {
    if (!this.isFormValid()) {
      await this.showErrorAlert('Incomplete Form', 'Please fill in all required fields and accept the terms and conditions.');
      return;
    }

    // Validate form data
    const validationError = this.validateFormData();
    if (validationError) {
      await this.showErrorAlert('Validation Error', validationError);
      return;
    }

    const loading = await this.showLoading();
    this.isLoading = true;

    try {
      // Create user in Firebase Authentication
      const credential = await this.afAuth.createUserWithEmailAndPassword(this.email.trim(), this.password);
      const uid = credential.user?.uid;

      if (!uid) throw new Error('User UID not found');

      // Update user profile with display name
      await credential.user?.updateProfile({
        displayName: `${this.name.trim()} ${this.surname.trim()}`
      });

      // Construct user data (role is automatically set to 'user')
      const newUser: User = {
        uid,
        name: this.name.trim(),
        surname: this.surname.trim(),
        gender: this.gender,
        idNumber: this.idNumber.trim(),
        email: this.email.trim().toLowerCase(),
        phoneNumber: this.phoneNumber.trim(),
        bankAccount: this.bankAccount.trim(),
        role: 'user', // Automatically set to 'user'
        kycDocs: {
          idDocUrl: '',
          proofOfResidenceUrl: ''
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save user data in Firestore using UID as document ID
      await this.afs.collection('users').doc(uid).set(newUser);

      await loading.dismiss();
      this.isLoading = false;

      // Show success message
      await this.showSuccessToast('Account created successfully! Welcome aboard!');

      // Clear form
      this.clearForm();

      // Navigate to login or dashboard
      this.router.navigate(['/login']); // or wherever you want to redirect

    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;

      console.error('Registration error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already registered. Please use a different email or try signing in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      await this.showErrorAlert('Registration Failed', errorMessage);
    }
  }

  // Clear form after successful registration
  private clearForm() {
    this.name = '';
    this.surname = '';
    this.gender = '';
    this.idNumber = '';
    this.email = '';
    this.phoneNumber = '';
    this.bankAccount = '';
    this.password = '';
    this.confirmPassword = '';
    this.acceptTerms = false;
  }

  // Navigate to login page
  goToLogin() {
    this.router.navigate(['/login']);
  }
}