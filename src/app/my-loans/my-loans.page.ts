import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Loan, Payment } from '../shared/models/loan.model';
import { User } from '../shared/models/user.model';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaymentData {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  paymentType: 'monthly' | 'full';
  transactionReference: string;
  paystackReference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  paidAt?: Date;
}

interface PenaltyCalculation {
  baseAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  monthsOverdue: number;
  penaltyRate: number;
  lastPaymentDate: Date | null;
  nextDueDate: Date;
}

@Component({
  selector: 'app-my-loans',
  templateUrl: './my-loans.page.html',
  styleUrls: ['./my-loans.page.scss'],
})
export class MyLoansPage implements OnInit, OnDestroy {
  private paystackScriptLoaded: boolean = false;
  private subscriptions: Subscription[] = [];
  private authSubscription?: Subscription;
  
  loans: Loan[] = [];
  currentUser: User | null = null;
  loading: boolean = true;
  authLoading: boolean = true;
  
// Updated penalty settings for 1-month terms
private readonly PENALTY_RATE = 0.30; // 30% penalty
private readonly PENALTY_PERIOD_DAYS = 30; // Apply penalty every 30 days after due date
private readonly GRACE_PERIOD_DAYS = 0; // No grace period for 1-month terms
  
  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) { }

  async ngOnInit() {
    console.log('MyLoansPage: ngOnInit started');
    this.loadPaystackScript();
    this.setupAuthStateListener();
  }

  ngOnDestroy() {
    console.log('MyLoansPage: ngOnDestroy called');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private setupAuthStateListener() {
    console.log('Setting up auth state listener');
    
    this.authSubscription = this.afAuth.authState.pipe(
      tap(user => console.log('Auth state changed:', user ? 'User logged in' : 'No user')),
      switchMap(async (firebaseUser) => {
        this.authLoading = true;
        
        if (firebaseUser) {
          console.log('Firebase user found:', firebaseUser.uid);
          
          try {
            const userDoc = await this.firestore.collection('users').doc(firebaseUser.uid).get().toPromise();
            
            if (userDoc && userDoc.exists) {
              const userData = userDoc.data() || {};
              this.currentUser = { 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '',
                ...userData 
              } as User;
            } else {
              this.currentUser = { 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
                surname: '',
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date()
              } as User;
              
              try {
                await this.firestore.collection('users').doc(firebaseUser.uid).set(this.currentUser);
                console.log('Created user document in Firestore');
              } catch (error) {
                console.warn('Failed to create user document:', error);
              }
            }
            
            console.log('Current user set:', this.currentUser);
            this.loadUserLoans();
            
          } catch (error) {
            console.error('Error loading user data:', error);
            this.currentUser = null;
            this.presentToast('Error loading user data');
          }
        } else {
          console.log('No authenticated user, redirecting to login');
          this.currentUser = null;
          this.loans = [];
          this.router.navigate(['/login']);
        }
        
        this.authLoading = false;
        this.loading = false;
        
        this.ngZone.run(() => {
          this.cdr.detectChanges();
        });
        
        return this.currentUser;
      })
    ).subscribe({
      error: (error) => {
        console.error('Auth state error:', error);
        this.authLoading = false;
        this.loading = false;
        this.presentToast('Authentication error occurred');
        this.cdr.detectChanges();
      }
    });
  }

  loadPaystackScript() {
    if (!this.paystackScriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        this.paystackScriptLoaded = true;
        console.log('Paystack script loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
      };
      document.body.appendChild(script);
    }
  }

  loadUserLoans() {
    console.log('Loading loans for user:', this.currentUser?.uid);
    
    if (!this.currentUser) {
      console.log('No current user, cannot load loans');
      this.loans = [];
      return;
    }

    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    const loansSubscription = this.firestore
      .collection('loans', ref => 
        ref.where('userId', '==', this.currentUser!.uid)
      )
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: async (loans: any[]) => {
          console.log('Loans loaded from Firestore:', loans.length);
          
          // Process loans and update any that have accumulated penalties
          const processedLoans = await this.processLoansWithPenalties(loans as Loan[]);
          
          const sortedLoans = processedLoans.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          this.loans = sortedLoans;
          console.log('Loans assigned to component:', this.loans.length);
          
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading loans:', error);
          this.loans = [];
          this.presentToast('Failed to load loans. Please try again.');
          
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        }
      });

    this.subscriptions.push(loansSubscription);
  }

  /**
   * Process loans and automatically apply compound interest penalties for overdue payments
   */
  private async processLoansWithPenalties(loans: Loan[]): Promise<Loan[]> {
    const processedLoans: Loan[] = [];
    
    for (const loan of loans) {
      if (loan.status === 'active') {
        const penaltyCalc = this.calculatePenaltyAmount(loan);
        
        // If there are penalties to apply and they haven't been applied yet
        if (penaltyCalc.penaltyAmount > 0 && !this.hasRecentPenaltyBeenApplied(loan, penaltyCalc.monthsOverdue)) {
          try {
            // Apply penalty by updating the loan amount
            const updatedLoan = await this.applyPenaltyToLoan(loan, penaltyCalc);
            processedLoans.push(updatedLoan);
          } catch (error) {
            console.error('Error applying penalty to loan:', loan.id, error);
            processedLoans.push(loan);
          }
        } else {
          processedLoans.push(loan);
        }
      } else {
        processedLoans.push(loan);
      }
    }
    
    return processedLoans;
  }



  /**
   * Get the last payment date for a loan
   */
  private getLastPaymentDate(loan: Loan): Date | null {
    if (!loan.payments || loan.payments.length === 0) {
      return null;
    }
    
    const paidPayments = loan.payments
      .filter(p => p.status === 'paid' && p.paidAt)
      .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());
    
    return paidPayments.length > 0 ? new Date(paidPayments[0].paidAt!) : null;
  }

  /**
   * Apply penalty to loan by updating the loan amount and adding penalty record
   */
  private async applyPenaltyToLoan(loan: Loan, penaltyCalc: PenaltyCalculation): Promise<Loan> {
    if (penaltyCalc.penaltyAmount <= 0) {
      return loan;
    }

    try {
      // Create penalty payment record
      const penaltyPayment: Payment = {
        id: this.firestore.createId(),
        loanId: loan.id,
        amount: -penaltyCalc.penaltyAmount, // Negative amount to indicate penalty
        dueDate: new Date(),
        status: 'overdue', // Mark as defaulted since it's a penalty
        paidAt: new Date(),
        transactionId: `PENALTY_${Date.now()}`,
        description: `Compound interest penalty for ${penaltyCalc.monthsOverdue} overdue period(s) - ${(penaltyCalc.penaltyRate * 100)}% per period`
      };

      // Update loan with new amount and penalty record
      const updatedPayments = [...(loan.payments || []), penaltyPayment];
      const updatedLoan: Loan = {
        ...loan,
        amount: penaltyCalc.totalAmount,
        payments: updatedPayments,
        updatedAt: new Date(),
        penaltyAppliedAt: new Date(),
        penaltyAmount: (loan.penaltyAmount || 0) + penaltyCalc.penaltyAmount
      };

      // Update in Firestore
      await this.firestore.collection('loans').doc(loan.id).update({
        amount: penaltyCalc.totalAmount,
        payments: updatedPayments,
        updatedAt: new Date(),
        penaltyAppliedAt: new Date(),
        penaltyAmount: (loan.penaltyAmount || 0) + penaltyCalc.penaltyAmount
      });

      console.log(`Applied penalty of R${penaltyCalc.penaltyAmount.toFixed(2)} to loan ${loan.id}`);
      
      return updatedLoan;
    } catch (error) {
      console.error('Error applying penalty to loan:', error);
      return loan;
    }
  }

  /**
   * Get penalty information for display
   */
  getPenaltyInfo(loan: Loan): PenaltyCalculation {
    return this.calculatePenaltyAmount(loan);
  }


  async refreshLoans(event: any) {
    console.log('Refreshing loans...');
    
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        console.log('User not authenticated during refresh');
        this.router.navigate(['/login']);
        return;
      }
      
      if (this.currentUser) {
        this.loadUserLoans();
      }
      
    } catch (error) {
      console.error('Error during refresh:', error);
      this.presentToast('Failed to refresh data');
    } finally {
      setTimeout(() => {
        event.target.complete();
      }, 1000);
    }
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      this.presentToast('Error logging out');
    }
  }

  get isAuthLoading(): boolean {
    return this.authLoading;
  }

  get isUserAuthenticated(): boolean {
    return !this.authLoading && this.currentUser !== null;
  }

  getActiveLoansCount(): number {
    if (!this.loans || this.loans.length === 0) {
      return 0;
    }
    return this.loans.filter(loan => loan.status === 'active' || loan.status === 'approved').length;
  }

  trackByLoanId(index: number, loan: Loan): string {
    return loan.id || index.toString();
  }

  // Updated penalty calculation methods for 1-month loan terms

/**
 * Calculate penalty amount based on overdue period - Updated for 1-month terms
 */
calculatePenaltyAmount(loan: Loan): PenaltyCalculation {
  const now = new Date();
  const loanStartDate = loan.approvedAt ? new Date(loan.approvedAt) : new Date(loan.createdAt);
  
  // For 1-month terms, payment is due at the end of the month
  const paymentDueDate = new Date(loanStartDate);
  paymentDueDate.setMonth(paymentDueDate.getMonth() + (loan.term || 1));
  
  // Calculate days overdue from the due date
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - paymentDueDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Apply penalty immediately after due date (no grace period for 1-month terms)
  const penaltyPeriods = Math.max(0, Math.floor(daysOverdue / 30)); // Every 30 days after due date
  
  // Get current outstanding amount
  const totalPaid = (loan.payments || [])
    .filter(p => p.status === 'paid' && p.amount > 0) // Only positive payments (exclude penalties)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const originalAmount = loan.amount || 0;
  const currentOutstanding = originalAmount - totalPaid;
  
  // Calculate compound penalty on outstanding amount
  let penaltyAmount = 0;
  if (penaltyPeriods > 0 && currentOutstanding > 0) {
    const compoundAmount = currentOutstanding * Math.pow(1 + this.PENALTY_RATE, penaltyPeriods);
    penaltyAmount = compoundAmount - currentOutstanding;
  }

  return {
    baseAmount: currentOutstanding,
    penaltyAmount: penaltyAmount,
    totalAmount: currentOutstanding + penaltyAmount,
    monthsOverdue: penaltyPeriods,
    penaltyRate: this.PENALTY_RATE,
    lastPaymentDate: this.getLastPaymentDate(loan),
    nextDueDate: paymentDueDate
  };
}

/**
 * Check if penalty has already been applied for current period - Updated
 */
private hasRecentPenaltyBeenApplied(loan: Loan, currentPenaltyPeriods: number): boolean {
  if (currentPenaltyPeriods === 0) return true; // No penalty needed
  
  // Count existing penalty applications
  const penaltyPayments = (loan.payments || []).filter(p => 
    p.amount < 0 || // Negative amount indicates penalty
    (p.description && p.description.includes('penalty'))
  );
  
  // If we have the same number of penalty periods as penalty payments, no new penalty needed
  return penaltyPayments.length >= currentPenaltyPeriods;
}

/**
 * Calculate remaining balance including any unpaid penalties
 */


/**
 * Calculate monthly payment for 1-month terms
 */
calculateMonthlyPayment(loan: Loan): number {
  if (!loan || loan.status === 'completed') return 0;
  
  // For 1-month terms, the entire amount + interest is due in one payment
  const totalAmount = (loan.amount || 0) * (1 + (loan.interestRate || 0) / 100);
  const penaltyInfo = this.calculatePenaltyAmount(loan);
  
  return totalAmount + penaltyInfo.penaltyAmount;
}

/**
 * Check if loan is overdue - Updated for 1-month terms
 */
isLoanOverdue(loan: Loan): boolean {
  if (loan.status !== 'active') return false;
  
  const now = new Date();
  const loanStartDate = loan.approvedAt ? new Date(loan.approvedAt) : new Date(loan.createdAt);
  const dueDate = new Date(loanStartDate);
  dueDate.setMonth(dueDate.getMonth() + (loan.term || 1));
  
  const remainingBalance = this.calculateRemainingBalance(loan);
  return now > dueDate && remainingBalance > 0;
}

/**
 * Get days until next penalty application
 */
getDaysUntilNextPenalty(loan: Loan): number {
  const now = new Date();
  const loanStartDate = loan.approvedAt ? new Date(loan.approvedAt) : new Date(loan.createdAt);
  const dueDate = new Date(loanStartDate);
  dueDate.setMonth(dueDate.getMonth() + (loan.term || 1));
  
  if (now <= dueDate) {
    // Not overdue yet
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Already overdue, calculate days to next penalty
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastPenalty = daysOverdue % 30;
  return 30 - daysSinceLastPenalty;
}


  calculateRemainingBalance(loan: Loan): number {
    if (!loan) return 0;
    
    const totalAmount = (loan.amount || 0) * (1 + ((loan.interestRate || 0) / 100 * (loan.term || 0) / 12));
    const payments = loan.payments || [];
    const totalPaid = payments.reduce((sum, payment) => 
      payment.status === 'paid' ? sum + (payment.amount || 0) : sum, 0
    );
    
    return Math.max(0, totalAmount - totalPaid);
  }

  calculateTotalDue(loan: Loan): number {
    if (!loan) return 0;
    return (loan.amount || 0) * (1 + ((loan.interestRate || 0) / 100 * (loan.term || 0) / 12));
  }

  async showPaymentOptions(loan: Loan) {
    const remainingBalance = this.calculateRemainingBalance(loan);
    const monthlyPayment = this.calculateMonthlyPayment(loan);
    const penaltyInfo = this.getPenaltyInfo(loan);
    const isOverdue = this.isLoanOverdue(loan);

    if (remainingBalance <= 0) {
      await this.presentToast('This loan has been fully paid.');
      return;
    }

    let alertMessage = `
      <p><strong>Remaining Balance:</strong> R${remainingBalance.toFixed(2)}</p>
      <p><strong>Monthly Payment:</strong> R${monthlyPayment.toFixed(2)}</p>
    `;

    if (isOverdue) {
      alertMessage += `
        <div style="color: #ff6b6b; margin-top: 10px;">
          <p><strong>⚠️ Payment Overdue</strong></p>
          <p>Next penalty in: ${this.getDaysUntilNextPenalty(loan)} days</p>
        </div>
      `;
    }

    if (penaltyInfo.penaltyAmount > 0) {
      alertMessage += `
        <div style="color: #ff6b6b; margin-top: 10px;">
          <p><strong>Penalties Applied:</strong> R${penaltyInfo.penaltyAmount.toFixed(2)}</p>
          <p><strong>Original Amount:</strong> R${penaltyInfo.baseAmount.toFixed(2)}</p>
        </div>
      `;
    }

    const alert = await this.alertController.create({
      header: 'Payment Options',
      message: alertMessage,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Pay Monthly Amount',
          handler: () => {
            this.makePayment(loan, monthlyPayment, 'monthly');
          }
        },
        {
          text: 'Pay Full Amount',
          handler: () => {
            this.makePayment(loan, remainingBalance, 'full');
          }
        }
      ]
    });

    await alert.present();
  }

  async makePayment(loan: Loan, amount: number, paymentType: 'monthly' | 'full') {
    if (!this.paystackScriptLoaded) {
      await this.presentToast('Payment system is loading. Please try again in a moment.');
      return;
    }

    if (typeof window.PaystackPop === 'undefined') {
      await this.presentToast('Payment system not available. Please refresh the page.');
      return;
    }

    if (!this.currentUser) {
      await this.presentToast('User not authenticated.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Initializing payment...'
    });
    await loading.present();

    try {
      const reference = `LOAN_${loan.id}_${Date.now()}`;
      
      const handler = window.PaystackPop.setup({
        key: environment.paystackTestPublicKey,
        email: this.currentUser.email,
        amount: Math.round(amount * 100),
        currency: 'ZAR',
        ref: reference,
        metadata: {
          loanId: loan.id,
          userId: this.currentUser.uid,
          paymentType: paymentType,
          custom_fields: [
            {
              display_name: "Loan ID",
              variable_name: "loan_id",
              value: loan.id
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type", 
              value: paymentType
            }
          ]
        },
        onClose: async () => {
          await loading.dismiss();
          console.log('Payment window closed');
        },
        callback: async (response: any) => {
          await loading.dismiss();
          console.log('Payment successful', response);
          await this.handlePaymentSuccess(loan, amount, paymentType, response);
        },
        onError: async (error: any) => {
          await loading.dismiss();
          console.error('Payment error:', error);
          await this.presentToast(`Payment failed: ${error.message || 'Unknown error'}`);
        }
      });

      await loading.dismiss();
      handler.openIframe();

    } catch (error) {
      await loading.dismiss();
      console.error('Payment initialization error:', error);
      await this.presentToast('Failed to initialize payment. Please try again.');
    }
  }

  async handlePaymentSuccess(loan: Loan, amount: number, paymentType: 'monthly' | 'full', paystackResponse: any) {
    const loading = await this.loadingController.create({
      message: 'Processing payment...'
    });
    await loading.present();

    try {
      const paymentData: PaymentData = {
        id: this.firestore.createId(),
        loanId: loan.id,
        userId: this.currentUser!.uid,
        amount: amount,
        paymentType: paymentType,
        transactionReference: paystackResponse.reference,
        paystackReference: paystackResponse.reference,
        status: 'completed',
        createdAt: new Date(),
        paidAt: new Date()
      };

      await this.firestore.collection('payments').doc(paymentData.id).set(paymentData);

      const newPayment: Payment = {
        id: paymentData.id,
        loanId: loan.id,
        amount: amount,
        dueDate: new Date(),
        status: 'paid',
        paidAt: new Date(),
        transactionId: paystackResponse.reference
      };

      const updatedPayments = [...loan.payments, newPayment];
      const remainingBalance = this.calculateRemainingBalance(loan) - amount;
      
      const updateData: Partial<Loan> = {
        payments: updatedPayments,
        updatedAt: new Date()
      };

      if (remainingBalance <= 0 || paymentType === 'full') {
        updateData.status = 'completed';
      }

      await this.firestore.collection('loans').doc(loan.id).update(updateData);

      await loading.dismiss();
      await this.presentToast(
        `Payment of R${amount.toFixed(2)} successful! ${
          remainingBalance <= 0 ? 'Loan fully paid.' : `Remaining balance: R${remainingBalance.toFixed(2)}`
        }`
      );

    } catch (error) {
      await loading.dismiss();
      console.error('Error processing payment:', error);
      await this.presentToast('Payment was successful but there was an error updating records. Please contact support.');
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'rejected': return 'danger';
      case 'defaulted': return 'danger';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'active': return 'play-circle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'rejected': return 'close-circle-outline';
      case 'defaulted': return 'warning-outline';
      default: return 'help-circle-outline';
    }
  }

  formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    
    if (date.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    }
    
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }
}