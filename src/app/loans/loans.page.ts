import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Loan } from '../shared/models/loan.model'; // Assuming you have a Loan model defined


export interface Payment {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue';
}

export interface LoanApplication {
  fullName: string;
  email: string;
  phone: string;
  amount: number;
  term: number;
  purpose: string;
  monthlyIncome: number;
  additionalInfo: string;
}

export interface UserDoc {
  id: string;
  email: string;
  // Add other user properties as needed
}

@Component({
  selector: 'app-loans',
  templateUrl: './loans.page.html',
  styleUrls: ['./loans.page.scss'],
})
export class LoansPage implements OnInit {
  isModalOpen = false;
  isSubmitting = false;
  estimatedRate = 0;
  currentUserDocId: string | null = null;
  isUserLoggedIn = false;
  
  loanApplication: LoanApplication = {
    fullName: '',
    email: '',
    phone: '',
    amount: 0,
    term: 12,
    purpose: '',
    monthlyIncome: 0,
    additionalInfo: ''
  };

  // Interest rate ranges for different loan types
  private interestRates = {
    personal: { min: 12, max: 24 },
    business: { min: 10, max: 20 },
    vehicle: { min: 8, max: 18 },
    home: { min: 7, max: 15 }
  };

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    // Check user authentication status and get user doc ID
    this.checkUserAuthentication();
    // Watch for changes in loan application to update estimated rate
    this.updateEstimatedRate();
  }

  async checkUserAuthentication() {
    try {
      const user = await this.afAuth.currentUser;
      
      if (user) {
        this.isUserLoggedIn = true;
        // Get user document ID from users collection
        await this.getUserDocId(user.email || user.uid);
      } else {
        this.isUserLoggedIn = false;
        this.currentUserDocId = null;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.isUserLoggedIn = false;
      this.currentUserDocId = null;
    }
  }

  async getUserDocId(userEmail: string) {
    try {
      // Query users collection to find document with matching email
      const userQuery = await this.firestore.collection('users', ref => 
        ref.where('email', '==', userEmail)
      ).get().toPromise();

      if (userQuery && !userQuery.empty) {
        const userDoc = userQuery.docs[0];
        this.currentUserDocId = userDoc.id;
        console.log('User document ID found:', this.currentUserDocId);
      } else {
        console.log('No user document found for email:', userEmail);
        this.currentUserDocId = null;
      }
    } catch (error) {
      console.error('Error fetching user document ID:', error);
      this.currentUserDocId = null;
    }
  }

  async openLoanApplicationModal() {
    // Check authentication before opening modal
    await this.checkUserAuthentication();
    
    if (!this.isUserLoggedIn) {
      await this.showAlert('Authentication Required', 'Please log in to apply for a loan.');
      return;
    }

    if (!this.currentUserDocId) {
      await this.showAlert('User Profile Not Found', 'Unable to find your user profile. Please contact support.');
      return;
    }

    this.isModalOpen = true;
    this.resetForm();
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.loanApplication = {
      fullName: '',
      email: '',
      phone: '',
      amount: 0,
      term: 12,
      purpose: '',
      monthlyIncome: 0,
      additionalInfo: ''
    };
    this.estimatedRate = 0;
  }

  updateEstimatedRate() {
    if (this.loanApplication.purpose && this.loanApplication.amount > 0) {
      const rates = this.interestRates[this.loanApplication.purpose as keyof typeof this.interestRates];
      if (rates) {
        // Calculate estimated rate based on amount and income
        let baseRate = rates.min;
        const amountFactor = Math.min(this.loanApplication.amount / 100000, 1) * 2; // Up to 2% increase for higher amounts
        const incomeFactor = this.loanApplication.monthlyIncome > 0 ? 
          Math.max(0, (50000 - this.loanApplication.monthlyIncome) / 50000) * 3 : 3; // Up to 3% increase for lower income
        
        this.estimatedRate = Math.min(baseRate + amountFactor + incomeFactor, rates.max);
        this.estimatedRate = Math.round(this.estimatedRate * 100) / 100; // Round to 2 decimal places
      }
    } else {
      this.estimatedRate = 0;
    }
  }

  calculateMonthlyPayment(): number {
    if (this.loanApplication.amount <= 0 || this.loanApplication.term <= 0 || this.estimatedRate <= 0) {
      return 0;
    }

    const principal = this.loanApplication.amount;
    const monthlyRate = (this.estimatedRate / 100) / 12;
    const numPayments = this.loanApplication.term;

    // Monthly payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    return monthlyPayment;
  }

  async submitLoanApplication() {
    try {
      this.isSubmitting = true;
      
      // Double-check authentication and user doc ID
      await this.checkUserAuthentication();
      
      if (!this.isUserLoggedIn) {
        await this.showAlert('Authentication Required', 'Please log in to submit a loan application.');
        return;
      }

      if (!this.currentUserDocId) {
        await this.showAlert('User Profile Not Found', 'Unable to find your user profile. Please contact support.');
        return;
      }

      // Get current user for additional info
      const user = await this.afAuth.currentUser;
      if (!user) {
        await this.showAlert('Authentication Error', 'Session expired. Please log in again.');
        return;
      }

      // Update estimated rate before submission
      this.updateEstimatedRate();

      // Create loan object using user doc ID
      const loanId = this.firestore.createId();
      const now = new Date();

      const loan: Loan = {
        id: loanId,
        userId: this.currentUserDocId, // Use the document ID from users collection
        amount: this.loanApplication.amount,
        interestRate: this.estimatedRate,
        term: this.loanApplication.term,
        purpose: this.loanApplication.purpose,
        status: 'pending',
        payments: [],
        createdAt: now,
        updatedAt: now
      };

      // Create application details object (for admin review)
      const applicationDetails = {
        loanId: loanId,
        fullName: this.loanApplication.fullName,
        email: this.loanApplication.email,
        phone: this.loanApplication.phone,
        monthlyIncome: this.loanApplication.monthlyIncome,
        additionalInfo: this.loanApplication.additionalInfo,
        userEmail: user.email,
        submittedAt: now,
        ...loan // Include all loan details
      };

      // Save to Firestore
      await this.firestore.collection('loans').doc(loanId).set(loan);
      await this.firestore.collection('loan-applications').doc(loanId).set(applicationDetails);

      // Show success message
      await this.showToast('Loan application submitted successfully! We will review your application within 2-3 business days.', 'success');
      
      // Close modal
      this.closeModal();

    } catch (error) {
      console.error('Error submitting loan application:', error);
      await this.showToast('Error submitting application. Please try again.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  // Watch for changes in form to update estimated rate
  onFormChange() {
    this.updateEstimatedRate();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}