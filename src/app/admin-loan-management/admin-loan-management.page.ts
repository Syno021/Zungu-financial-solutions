import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { map, switchMap } from 'rxjs/operators';

// KYC Interface
export interface KYC {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'verified';
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
  documents: {
    idDocument?: string;
    proofOfAddress?: string;
    proofOfIncome?: string;
  };
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
}

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
  // KYC verification status
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'verified';
  kycVerifiedAt?: Date;
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
  kycRecords$!: Observable<KYC[]>;
  
  // Original data arrays
  allApplications: LoanApplication[] = [];
  allLoans: Loan[] = [];
  allKycRecords: KYC[] = [];
  
  // Filtered data arrays
  filteredApplications: LoanApplication[] = [];
  filteredLoans: Loan[] = [];
  
  // Filter and search options
  applicationStatusFilter = 'all';
  loanStatusFilter = 'all';
  applicationSearchTerm = '';
  loanSearchTerm = '';
  
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
    // Load KYC records first
    this.kycRecords$ = this.firestore
      .collection<KYC>('kyc')
      .valueChanges({ idField: 'id' });

    // Load loan applications with KYC verification
    this.loanApplications$ = combineLatest([
      this.firestore.collection<LoanApplication>('loan-applications').valueChanges({ idField: 'id' }),
      this.kycRecords$
    ]).pipe(
      map(([applications, kycRecords]) => {
        // Create a map of userId to KYC status for quick lookup
        const kycMap = new Map<string, KYC>();
        kycRecords.forEach(kyc => {
          kycMap.set(kyc.userId, kyc);
        });

        // Filter applications to only include those with verified KYC
        const verifiedApplications = applications.filter(app => {
          const kycRecord = kycMap.get(app.userId);
          return kycRecord && kycRecord.status === 'verified';
        });

        // Enhance applications with KYC information
        const enhancedApplications = verifiedApplications.map(app => {
          const kycRecord = kycMap.get(app.userId);
          return {
            ...app,
            kycStatus: kycRecord?.status,
            kycVerifiedAt: kycRecord?.verifiedAt
          };
        });

        // Sort by creation date (newest first)
        return enhancedApplications.sort((a, b) => {
          const dateA = a.createdAt ? (a.createdAt as any).toDate() : new Date(0);
          const dateB = b.createdAt ? (b.createdAt as any).toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      })
    );
    
    // Load loans with KYC verification
    this.loans$ = combineLatest([
      this.firestore.collection<Loan>('loans').valueChanges({ idField: 'id' }),
      this.kycRecords$
    ]).pipe(
      map(([loans, kycRecords]) => {
        // Create a map of userId to KYC status for quick lookup
        const kycMap = new Map<string, KYC>();
        kycRecords.forEach(kyc => {
          kycMap.set(kyc.userId, kyc);
        });

        // Filter loans to only include those with verified KYC
        const verifiedLoans = loans.filter(loan => {
          const kycRecord = kycMap.get(loan.userId);
          return kycRecord && kycRecord.status === 'verified';
        });

        // Sort by creation date (newest first)
        return verifiedLoans.sort((a, b) => {
          const dateA = a.createdAt ? (a.createdAt as any).toDate() : new Date(0);
          const dateB = b.createdAt ? (b.createdAt as any).toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      })
    );
    
    // Subscribe to data changes
    this.loanApplications$.subscribe(applications => {
      this.allApplications = applications;
      this.applyApplicationFilters();
    });
    
    this.loans$.subscribe(loans => {
      this.allLoans = loans;
      this.applyLoanFilters();
    });

    this.kycRecords$.subscribe(kycRecords => {
      this.allKycRecords = kycRecords;
    });
  }

  // Helper method to check KYC verification status
  private async checkKycVerification(userId: string): Promise<boolean> {
  try {
    console.log(`Checking KYC verification for user: ${userId}`);
    
    // First check if we have the KYC record in our local data
    const localKycRecord = this.allKycRecords.find(kyc => kyc.userId === userId);
    
    if (localKycRecord) {
      console.log(`Local KYC status for ${userId}:`, localKycRecord.status);
      const isVerified = localKycRecord.status === 'verified';
      
      if (!isVerified) {
        console.log(`KYC not verified for user ${userId}. Status: ${localKycRecord.status}`);
        await this.showKycErrorToast(localKycRecord.status);
      }
      
      return isVerified;
    }
    
    // If not found locally, fetch from Firestore
    console.log(`KYC record not found locally for ${userId}, fetching from Firestore...`);
    
    const kycQuery = await this.firestore
      .collection('kyc', ref => ref.where('userId', '==', userId))
      .get()
      .toPromise();
    
    if (kycQuery && !kycQuery.empty) {
      const kycDoc = kycQuery.docs[0];
      const kycData = kycDoc.data() as KYC;
      
      console.log(`Firestore KYC status for ${userId}:`, kycData.status);
      const isVerified = kycData.status === 'verified';
      
      if (!isVerified) {
        console.log(`KYC not verified for user ${userId}. Status: ${kycData.status}`);
        await this.showKycErrorToast(kycData.status);
      }
      
      return isVerified;
    }
    
    // No KYC record found at all
    console.log(`No KYC record found for user ${userId}`);
    await this.showKycErrorToast('not_found');
    return false;
    
  } catch (error) {
    console.error('Error checking KYC verification status:', error);
    await this.showKycErrorToast('error');
    return false;
  }
}

private async showKycErrorToast(status: string) {
  let message = '';
  
  switch (status) {
    case 'pending':
      message = 'Cannot proceed: User KYC verification is still pending';
      break;
    case 'rejected':
      message = 'Cannot proceed: User KYC verification was rejected';
      break;
    case 'approved':
      message = 'Cannot proceed: User KYC is approved but not yet verified';
      break;
    case 'not_found':
      message = 'Cannot proceed: No KYC record found for this user';
      break;
    case 'error':
      message = 'Cannot proceed: Error checking KYC verification status';
      break;
    default:
      message = `Cannot proceed: User KYC status is '${status}', verification required`;
  }
  
  const toast = await this.toastController.create({
    message: message,
    duration: 4000,
    color: 'danger',
    position: 'top',
    buttons: [
      {
        text: 'Dismiss',
        role: 'cancel'
      }
    ]
  });
  await toast.present();
}

  // Helper method to get KYC status for a user
  private getKycStatus(userId: string): KYC | null {
    return this.allKycRecords.find(kyc => kyc.userId === userId) || null;
  }

  // Application search and filter methods
  onApplicationSearch() {
    this.applyApplicationFilters();
  }

  onApplicationFilterChange() {
    this.applyApplicationFilters();
  }

  private applyApplicationFilters() {
    let filtered = [...this.allApplications];

    // Apply status filter
    if (this.applicationStatusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === this.applicationStatusFilter);
    }

    // Apply search filter
    if (this.applicationSearchTerm.trim()) {
      const searchTerm = this.applicationSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(app => 
        app.fullName.toLowerCase().includes(searchTerm) ||
        app.email.toLowerCase().includes(searchTerm) ||
        app.phone.includes(searchTerm) ||
        app.purpose.toLowerCase().includes(searchTerm) ||
        app.userId.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredApplications = filtered;
  }

  // Loan search and filter methods
  onLoanSearch() {
    this.applyLoanFilters();
  }

  onLoanFilterChange() {
    this.applyLoanFilters();
  }

  private applyLoanFilters() {
    let filtered = [...this.allLoans];

    // Apply status filter
    if (this.loanStatusFilter !== 'all') {
      filtered = filtered.filter(loan => loan.status === this.loanStatusFilter);
    }

    // Apply search filter
    if (this.loanSearchTerm.trim()) {
      const searchTerm = this.loanSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(loan => 
        loan.id.toLowerCase().includes(searchTerm) ||
        loan.userId.toLowerCase().includes(searchTerm) ||
        loan.purpose.toLowerCase().includes(searchTerm) ||
        loan.amount.toString().includes(searchTerm)
      );
    }

    this.filteredLoans = filtered;
  }

  // Clear search methods
  clearApplicationSearch() {
    this.applicationSearchTerm = '';
    this.applyApplicationFilters();
  }

  clearLoanSearch() {
    this.loanSearchTerm = '';
    this.applyLoanFilters();
  }

  // Search helper methods for additional functionality
  getApplicationSearchResultsCount(): number {
    return this.filteredApplications.length;
  }

  getLoanSearchResultsCount(): number {
    return this.filteredLoans.length;
  }

  // Enhanced search with multiple criteria
  searchApplicationsAdvanced(criteria: {
    name?: string;
    email?: string;
    phone?: string;
    minAmount?: number;
    maxAmount?: number;
    status?: string;
    purpose?: string;
  }) {
    let filtered = [...this.allApplications];

    if (criteria.name) {
      filtered = filtered.filter(app => 
        app.fullName.toLowerCase().includes(criteria.name!.toLowerCase())
      );
    }

    if (criteria.email) {
      filtered = filtered.filter(app => 
        app.email.toLowerCase().includes(criteria.email!.toLowerCase())
      );
    }

    if (criteria.phone) {
      filtered = filtered.filter(app => 
        app.phone.includes(criteria.phone!)
      );
    }

    if (criteria.minAmount !== undefined) {
      filtered = filtered.filter(app => app.amount >= criteria.minAmount!);
    }

    if (criteria.maxAmount !== undefined) {
      filtered = filtered.filter(app => app.amount <= criteria.maxAmount!);
    }

    if (criteria.status && criteria.status !== 'all') {
      filtered = filtered.filter(app => app.status === criteria.status);
    }

    if (criteria.purpose) {
      filtered = filtered.filter(app => 
        app.purpose.toLowerCase().includes(criteria.purpose!.toLowerCase())
      );
    }

    this.filteredApplications = filtered;
  }

  // Quick search presets
  searchPendingApplications() {
    this.applicationStatusFilter = 'pending';
    this.applicationSearchTerm = '';
    this.applyApplicationFilters();
  }

  searchHighValueLoans(threshold: number = 10000) {
    this.loanSearchTerm = '';
    this.loanStatusFilter = 'all';
    this.filteredLoans = this.allLoans.filter(loan => loan.amount >= threshold);
  }

  searchActiveLoans() {
    this.loanStatusFilter = 'active';
    this.loanSearchTerm = '';
    this.applyLoanFilters();
  }

  searchOverdueLoans() {
    // This would require payment data analysis
    this.loanStatusFilter = 'active';
    this.loanSearchTerm = '';
    this.applyLoanFilters();
    
    // Additional logic to filter by overdue payments would go here
    // You'd need to check the payments array for overdue items
  }

  async approveApplication(application: LoanApplication) {
    // Double-check KYC verification before showing approval dialog
    const isKycVerified = await this.checkKycVerification(application.userId);
    
    if (!isKycVerified) {
      const toast = await this.toastController.create({
        message: 'Cannot approve application: User KYC is not verified',
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const kycRecord = this.getKycStatus(application.userId);
    const kycVerificationDate = kycRecord?.verifiedAt ? 
      this.formatDate(kycRecord.verifiedAt) : 'Unknown';

    const alert = await this.alertController.create({
      header: 'Approve Loan Application',
      message: `
        <div>
          <p><strong>Applicant:</strong> ${application.fullName}</p>
          <p><strong>KYC Status:</strong> <span style="color: green;">✓ Verified</span></p>
          <p><strong>KYC Verified:</strong> ${kycVerificationDate}</p>
          <br>
          <p>Are you sure you want to approve this loan application?</p>
        </div>
      `,
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
            // Final KYC check before processing
            const finalKycCheck = await this.checkKycVerification(application.userId);
            if (!finalKycCheck) {
              this.showToast('KYC verification lost. Cannot proceed with approval.', 'danger');
              return false;
            }
            await this.processApplicationApproval(application, data);
            return true;
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
      // Final KYC verification check
      const isKycVerified = await this.checkKycVerification(application.userId);
      if (!isKycVerified) {
        await loading.dismiss();
        this.showToast('Cannot process approval: User KYC is no longer verified', 'danger');
        return;
      }

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
    // Check KYC verification before activation
    const isKycVerified = await this.checkKycVerification(loan.userId);
    
    if (!isKycVerified) {
      const toast = await this.toastController.create({
        message: 'Cannot activate loan: User KYC is not verified',
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Activate Loan',
      message: `Activate loan for user ${loan.userId}? (KYC Status: ✓ Verified)`,
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
      // Final KYC verification check
      const isKycVerified = await this.checkKycVerification(loan.userId);
      if (!isKycVerified) {
        await loading.dismiss();
        this.showToast('Cannot activate loan: User KYC is no longer verified', 'danger');
        return;
      }

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

  // Replace the existing calculateMonthlyPayment function with this simplified version
calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) {
    return 0;
  }
  
  // Apply flat 30% interest to the principal
  const interestRate = 0.30; // 30%
  const totalInterest = principal * interestRate;
  const totalAmountToBePaid = principal + totalInterest;
  
  // Calculate monthly payment by dividing total amount by number of months
  const monthlyPayment = totalAmountToBePaid / months;
  
  // Round to 2 decimal places
  return Math.round(monthlyPayment * 100) / 100;
}

// Optional: You might also want to add a helper function to calculate the total amount
calculateTotalAmount(principal: number): number {
  if (principal <= 0) {
    return 0;
  }
  
  const interestRate = 0.30; // 30%
  const totalInterest = principal * interestRate;
  const totalAmount = principal + totalInterest;
  
  return Math.round(totalAmount * 100) / 100;
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

  // Helper method to get KYC verification status display
  getKycStatusDisplay(userId: string): { status: string; color: string; verified: boolean } {
    const kycRecord = this.getKycStatus(userId);
    if (!kycRecord) {
      return { status: 'No KYC', color: 'danger', verified: false };
    }
    
    switch (kycRecord.status) {
      case 'verified':
        return { status: 'Verified ✓', color: 'success', verified: true };
      case 'approved':
        return { status: 'Approved', color: 'primary', verified: false };
      case 'pending':
        return { status: 'Pending', color: 'warning', verified: false };
      case 'rejected':
        return { status: 'Rejected', color: 'danger', verified: false };
      default:
        return { status: 'Unknown', color: 'medium', verified: false };
    }
  }
}