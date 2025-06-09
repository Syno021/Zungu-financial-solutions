import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Loan } from '../shared/models/loan.model'; // Assuming you have a Loan model defined
import { User } from '../shared/models/user.model';
import { KYC } from '../shared/models/kyc.model';

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
  isKycModalOpen = false;
  isSubmitting = false;
  estimatedRate = 0;
  currentUserDocId: string | null = null;
  currentUser: User | null = null;
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

  // KYC document upload data
  kycDocuments = {
    idDocument: null as File | null,
    proofOfResidence: null as File | null
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
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.isUserLoggedIn = false;
      this.currentUserDocId = null;
      this.currentUser = null;
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
        const userData = userDoc.data() || {};
        this.currentUser = { id: userDoc.id, ...userData } as User & { id: string };
        console.log('User document ID found:', this.currentUserDocId);
      } else {
        console.log('No user document found for email:', userEmail);
        this.currentUserDocId = null;
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Error fetching user document ID:', error);
      this.currentUserDocId = null;
      this.currentUser = null;
    }
  }

  async openLoanApplicationModal() {
    // Check authentication before opening modal
    await this.checkUserAuthentication();
    
    if (!this.isUserLoggedIn) {
      await this.showAlert('Authentication Required', 'Please log in to apply for a loan.');
      return;
    }

    if (!this.currentUserDocId || !this.currentUser) {
      await this.showAlert('User Profile Not Found', 'Unable to find your user profile. Please contact support.');
      return;
    }

    // Check if user has KYC documents
    if (!this.currentUser.kycDocs || !this.currentUser.kycDocs.id) {
      // No KYC documents found, open KYC modal first
      await this.showAlert('KYC Verification Required', 'Please complete your KYC verification before applying for a loan.');
      this.openKycModal();
      return;
    }

    // KYC documents exist, proceed with loan application
    this.isModalOpen = true;
    this.resetForm();
  }

  openKycModal() {
    this.isKycModalOpen = true;
    this.resetKycForm();
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  closeKycModal() {
    this.isKycModalOpen = false;
    this.resetKycForm();
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

  resetKycForm() {
    this.kycDocuments = {
      idDocument: null,
      proofOfResidence: null
    };
  }

  // Handle file selection for KYC documents
  onFileSelected(event: any, documentType: 'idDocument' | 'proofOfResidence') {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        this.showToast('Please select a valid file type (JPEG, PNG, or PDF)', 'danger');
        return;
      }

      if (file.size > maxSize) {
        this.showToast('File size must be less than 5MB', 'danger');
        return;
      }

      this.kycDocuments[documentType] = file;
    }
  }

  async submitKycDocuments() {
    try {
      this.isSubmitting = true;

      // Validate that both documents are selected
      if (!this.kycDocuments.idDocument || !this.kycDocuments.proofOfResidence) {
        await this.showToast('Please select both ID document and proof of residence', 'danger');
        return;
      }

      if (!this.currentUserDocId) {
        await this.showAlert('Error', 'User profile not found. Please try again.');
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Uploading KYC documents...'
      });
      await loading.present();

      // Create KYC document ID
      const kycId = this.firestore.createId();
      const now = new Date();

      // Here you would typically upload files to Firebase Storage
      // For this example, I'll simulate the upload URLs
      // Replace this with actual file upload logic
      const idDocumentUrl = await this.uploadFile(this.kycDocuments.idDocument, `kyc/${kycId}/id-document`);
      const proofOfResidenceUrl = await this.uploadFile(this.kycDocuments.proofOfResidence, `kyc/${kycId}/proof-of-residence`);

      // Create KYC document object
      const kycDocument: KYC = {
        id: kycId,
        userId: this.currentUserDocId,
        status: 'pending',
        idDocument: {
          url: idDocumentUrl
        },
        proofOfResidence: {
          url: proofOfResidenceUrl
        },
        submittedAt: now,
        updatedAt: now
      };

      // Save KYC document to firestore
      await this.firestore.collection('kyc').doc(kycId).set(kycDocument);

      // Update user document with KYC reference
      await this.firestore.collection('users').doc(this.currentUserDocId).update({
        kycDocs: { id: kycId },
        updatedAt: now
      });

      // Update local user object
      if (this.currentUser) {
        this.currentUser.kycDocs = { id: kycId };
      }

      await loading.dismiss();

      await this.showToast('KYC documents submitted successfully! You can now apply for a loan.', 'success');
      
      // Close KYC modal and open loan application modal
      this.closeKycModal();
      this.isModalOpen = true;
      this.resetForm();

    } catch (error) {
      console.error('Error submitting KYC documents:', error);
      await this.showToast('Error uploading documents. Please try again.', 'danger');
    } finally {
      this.isSubmitting = false;
      const loading = await this.loadingController.getTop();
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  // Placeholder for file upload function
  private async uploadFile(file: File, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64String = reader.result as string;
        // Return the base64 string which will be stored directly in Firestore
        resolve(base64String);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
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