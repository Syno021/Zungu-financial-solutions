import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { FacilityService } from 'src/app/services/facility.service';
import firebase from 'firebase/compat/app';
@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit {
  // Form data
  facility = {
    name: '',
    type: '' as 'Hospital' | 'Clinic' | 'Private Practice',
    registrationNumber: '',
    location: {
      street: '',
      city: '',
      province: '', // Changed from 'state' to 'province'
      postalCode: '',
      country: 'South Africa'
    },
    contactEmail: '',
    contactPhone: '',
    registeredAt: null as Date | firebase.firestore.Timestamp | null
  };
  
  password = '';
  showPassword = false;
  isSubmitting = false;
  
  // Error flags
  nameError = false;
  typeError = false;
  registrationNumberError = false;
  streetError = false;
  cityError = false;
  stateError = false;
  postalCodeError = false;
  emailError = false;
  phoneError = false;
  passwordError = false;
  provinceError =false;
  // Facility types
  facilityTypes = ['Hospital', 'Clinic', 'Private Practice'];

  constructor(
    private authService: AuthService,
    private facilityService: FacilityService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {}

  // Toggle password visibility
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Validate form fields
  validateForm(): boolean {
    let isValid = true;
    
    // Reset all errors
    this.nameError = false;
    this.typeError = false;
    this.registrationNumberError = false;
    this.streetError = false;
    this.cityError = false;
    this.stateError = false;
    this.postalCodeError = false;
    this.emailError = false;
    this.phoneError = false;
    this.passwordError = false;
    this.provinceError = false;
    
    // Validate facility information
    if (!this.facility.name.trim()) {
      this.nameError = true;
      isValid = false;
    }
    
    if (!this.facility.type) {
      this.typeError = true;
      isValid = false;
    }
    
    if (!this.facility.registrationNumber.trim()) {
      this.registrationNumberError = true;
      isValid = false;
    }
    
    // Validate address
    if (!this.facility.location.street.trim()) {
      this.streetError = true;
      isValid = false;
    }
    
    if (!this.facility.location.city.trim()) {
      this.cityError = true;
      isValid = false;
    }
    
  // In validation
if (!this.facility.location.province.trim()) {
  this.provinceError = true; // You'd need to rename this variable too
  isValid = false;
}
    
    if (!this.facility.location.postalCode.trim()) {
      this.postalCodeError = true;
      isValid = false;
    }
    
    // Validate contact information
    if (!this.facility.contactEmail.trim() || !this.validateEmail(this.facility.contactEmail)) {
      this.emailError = true;
      isValid = false;
    }
    
    if (!this.facility.contactPhone.trim()) {
      this.phoneError = true;
      isValid = false;
    }
    
    // Validate password
    if (!this.password || this.password.length < 8) {
      this.passwordError = true;
      isValid = false;
    }
    
    return isValid;
  }
  
  // Basic email validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Handle facility registration
  async onSubmit() {
    if (!this.validateForm()) {
      await this.presentToast('Please fill all required fields correctly', 'danger');
      return;
    }
  
    try {
      this.isSubmitting = true;
      const loading = await this.loadingController.create({
        message: 'Registering facility...',
        spinner: 'crescent'
      });
      await loading.present();
  
      // Register the user with Firebase Authentication
      const email = this.facility.contactEmail;
      const password = this.password;
      
      const credential = await this.authService.registerUser(email, password).toPromise();
      
      if (credential && credential.user) {
        // Create a new facility object with the correct types
        const facilityData = {
          ...this.facility,
          registeredAt: new Date(),
          // Ensure type is one of the allowed values
          type: this.facility.type as 'Hospital' | 'Clinic' | 'Private Practice'
        };
        
        // Use FacilityService to create the facility
        await this.facilityService.addFacility(facilityData).toPromise();
        
        await loading.dismiss();
        this.isSubmitting = false;
        await this.presentToast('Facility registered successfully!', 'success');
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.isSubmitting = false;
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error instanceof Error) {
        // Handle specific Firebase errors
        if (error.message.includes('email-already-in-use')) {
          errorMessage = 'Email is already registered. Please use a different email.';
        }
      }
      
      const loading = await this.loadingController.getTop();
      if (loading) {
        await loading.dismiss();
      }
      
      await this.presentToast(errorMessage, 'danger');
    }
  }

  // Present toast message
  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [{
        text: 'Close',
        role: 'cancel'
      }]
    });
    await toast.present();
  }
}