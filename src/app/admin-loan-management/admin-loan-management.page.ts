import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

// Updated interfaces to match your actual data structure
export interface Payment {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue';
}

export interface Loan {
  id: string;
  userId: string;
  amount: number;
  interestRate: number;
  term: number; // in months
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted';
  approvedBy?: string; // admin uid
  approvedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanApplication {
  loanId: string;
  fullName: string;
  email: string;
  phone: string;
  monthlyIncome: number;
  additionalInfo: string;
  userEmail: string;
  submittedAt: Date;
  // Loan details included in application
  userId: string;
  amount: number;
  interestRate: number;
  term: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted';
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-admin-loan-management',
  templateUrl: './admin-loan-management.page.html',
  styleUrls: ['./admin-loan-management.page.scss'],
})
export class AdminLoanManagementPage implements OnInit {
  
  currentView: 'applications' | 'loans' = 'applications';
  loanApplications$!: Observable<LoanApplication[]>;
  loans$!: Observable<Loan[]>;
  
  filteredApplications: LoanApplication[] = [];
  filteredLoans: Loan[] = [];
  
  // Filter options
  applicationStatusFilter = 'all';
  loanStatusFilter = 'all';
  
  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Load loan applications - no ordering, just pull data
    this.loanApplications$ = this.firestore
      .collection<LoanApplication>('loan-applications')
      .valueChanges({ idField: 'id' });
    
    // Load loans - no ordering, just pull data
    this.loans$ = this.firestore
      .collection<Loan>('loans')
      .valueChanges({ idField: 'id' });
    
    // Subscribe to data changes
    this.loanApplications$.subscribe(applications => {
      this.filteredApplications = this.filterApplications(applications);
    });
    
    this.loans$.subscribe(loans => {
      this.filteredLoans = this.filterLoans(loans);
    });
  }

  filterApplications(applications: LoanApplication[]): LoanApplication[] {
    if (this.applicationStatusFilter === 'all') {
      return applications;
    }
    return applications.filter(app => app.status === this.applicationStatusFilter);
  }

  filterLoans(loans: Loan[]): Loan[] {
    if (this.loanStatusFilter === 'all') {
      return loans;
    }
    return loans.filter(loan => loan.status === this.loanStatusFilter);
  }

  onApplicationFilterChange() {
    this.loanApplications$.subscribe(applications => {
      this.filteredApplications = this.filterApplications(applications);
    });
  }

  onLoanFilterChange() {
    this.loans$.subscribe(loans => {
      this.filteredLoans = this.filterLoans(loans);
    });
  }

  async approveApplication(application: LoanApplication) {
    const alert = await this.alertController.create({
      header: 'Approve Loan Application',
      message: `Are you sure you want to approve the loan application for ${application.fullName}?`,
      inputs: [
        {
          name: 'loanAmount',
          type: 'number',
          placeholder: 'Approved Amount',
          value: application.amount
        },
        {
          name: 'interestRate',
          type: 'number',
          placeholder: 'Interest Rate (%)',
          value: application.interestRate
        },
        {
          name: 'termMonths',
          type: 'number',
          placeholder: 'Term (Months)',
          value: application.term
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: async (data) => {
            await this.processApplicationApproval(application, data);
          }
        }
      ]
    });
    await alert.present();
  }

  async processApplicationApproval(application: LoanApplication, loanData: any) {
    const loading = await this.loadingController.create({
      message: 'Processing approval...'
    });
    await loading.present();

    try {
      const now = new Date();
      
      // Update the loan record in the loans collection
      const updatedLoan: Partial<Loan> = {
        amount: parseFloat(loanData.loanAmount),
        interestRate: parseFloat(loanData.interestRate),
        term: parseInt(loanData.termMonths),
        status: 'approved',
        approvedAt: now,
        startDate: now,
        endDate: new Date(now.getTime() + (parseInt(loanData.termMonths) * 30 * 24 * 60 * 60 * 1000)), // Approximate end date
        updatedAt: now
      };

      await this.firestore.doc(`loans/${application.loanId}`).update(updatedLoan);

      // Update application status in loan-applications collection
      await this.firestore.doc(`loan-applications/${application.loanId}`).update({
        status: 'approved',
        approvedAt: now,
        amount: parseFloat(loanData.loanAmount),
        interestRate: parseFloat(loanData.interestRate),
        term: parseInt(loanData.termMonths),
        updatedAt: now
      });

      await loading.dismiss();
      this.showToast('Application approved successfully!', 'success');
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error processing approval', 'danger');
      console.error('Error:', error);
    }
  }

  async rejectApplication(application: LoanApplication) {
    const alert = await this.alertController.create({
      header: 'Reject Loan Application',
      message: `Please provide a reason for rejecting ${application.fullName}'s application:`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Rejection reason...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject',
          handler: async (data) => {
            await this.processApplicationRejection(application, data.reason);
          }
        }
      ]
    });
    await alert.present();
  }

  async processApplicationRejection(application: LoanApplication, reason: string) {
    const loading = await this.loadingController.create({
      message: 'Processing rejection...'
    });
    await loading.present();

    try {
      const now = new Date();

      // Update loan record
      await this.firestore.doc(`loans/${application.loanId}`).update({
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: now,
        updatedAt: now
      });

      // Update application record
      await this.firestore.doc(`loan-applications/${application.loanId}`).update({
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: now,
        updatedAt: now
      });

      await loading.dismiss();
      this.showToast('Application rejected', 'warning');
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error processing rejection', 'danger');
      console.error('Error:', error);
    }
  }

  async activateLoan(loan: Loan) {
    const alert = await this.alertController.create({
      header: 'Activate Loan',
      message: `Activate loan for user ${loan.userId}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Activate',
          handler: async () => {
            await this.processLoanActivation(loan);
          }
        }
      ]
    });
    await alert.present();
  }

  async processLoanActivation(loan: Loan) {
    const loading = await this.loadingController.create({
      message: 'Activating loan...'
    });
    await loading.present();

    try {
      const now = new Date();
      
      await this.firestore.doc(`loans/${loan.id}`).update({
        status: 'active',
        startDate: now,
        updatedAt: now
      });

      await loading.dismiss();
      this.showToast('Loan activated successfully!', 'success');
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error activating loan', 'danger');
      console.error('Error:', error);
    }
  }

  async completeLoan(loan: Loan) {
    const alert = await this.alertController.create({
      header: 'Complete Loan',
      message: `Mark loan as completed for user ${loan.userId}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Complete',
          handler: async () => {
            await this.processLoanCompletion(loan);
          }
        }
      ]
    });
    await alert.present();
  }

  async processLoanCompletion(loan: Loan) {
    const loading = await this.loadingController.create({
      message: 'Completing loan...'
    });
    await loading.present();

    try {
      const now = new Date();
      
      await this.firestore.doc(`loans/${loan.id}`).update({
        status: 'completed',
        completedAt: now,
        updatedAt: now
      });

      await loading.dismiss();
      this.showToast('Loan marked as completed!', 'success');
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error completing loan', 'danger');
      console.error('Error:', error);
    }
  }

  async defaultLoan(loan: Loan) {
    const alert = await this.alertController.create({
      header: 'Default Loan',
      message: `Mark loan as defaulted for user ${loan.userId}?`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Default reason...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Default',
          handler: async (data) => {
            await this.processLoanDefault(loan, data.reason);
          }
        }
      ]
    });
    await alert.present();
  }

  async processLoanDefault(loan: Loan, reason: string) {
    const loading = await this.loadingController.create({
      message: 'Processing default...'
    });
    await loading.present();

    try {
      const now = new Date();
      
      await this.firestore.doc(`loans/${loan.id}`).update({
        status: 'defaulted',
        defaultReason: reason,
        defaultedAt: now,
        updatedAt: now
      });

      await loading.dismiss();
      this.showToast('Loan marked as defaulted', 'warning');
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error defaulting loan', 'danger');
      console.error('Error:', error);
    }
  }

  calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
    if (principal <= 0 || annualRate <= 0 || months <= 0) {
      return 0;
    }
    
    const monthlyRate = annualRate / 100 / 12;
    const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                   (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment * 100) / 100;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }

  // Helper method to get monthly payment for display
  getMonthlyPayment(item: Loan | LoanApplication): number {
    return this.calculateMonthlyPayment(item.amount, item.interestRate, item.term);
  }
}