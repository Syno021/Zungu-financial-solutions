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
  authLoading: boolean = true; // Track auth state loading
  
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
    
    // Set up auth state listener first
    this.setupAuthStateListener();
  }

  ngOnDestroy() {
    console.log('MyLoansPage: ngOnDestroy called');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Set up Firebase Auth state listener for persistent session management
   */
  private setupAuthStateListener() {
    console.log('Setting up auth state listener');
    
    this.authSubscription = this.afAuth.authState.pipe(
      tap(user => console.log('Auth state changed:', user ? 'User logged in' : 'No user')),
      switchMap(async (firebaseUser) => {
        this.authLoading = true;
        
        if (firebaseUser) {
          console.log('Firebase user found:', firebaseUser.uid);
          
          try {
            // Get user data from Firestore
            const userDoc = await this.firestore.collection('users').doc(firebaseUser.uid).get().toPromise();
            
            if (userDoc && userDoc.exists) {
              const userData = userDoc.data() || {};
              this.currentUser = { 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '',
                ...userData 
              } as User;
            } else {
              // Create basic user object if no Firestore document exists
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
              
              // Optionally create user document in Firestore
              try {
                await this.firestore.collection('users').doc(firebaseUser.uid).set(this.currentUser);
                console.log('Created user document in Firestore');
              } catch (error) {
                console.warn('Failed to create user document:', error);
              }
            }
            
            console.log('Current user set:', this.currentUser);
            
            // Load loans for authenticated user
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
          
          // Redirect to login page if no user is authenticated
          this.router.navigate(['/login']);
        }
        
        this.authLoading = false;
        this.loading = false;
        
        // Trigger change detection
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

    // Clear existing loan subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Load loans with real-time updates
    const loansSubscription = this.firestore
      .collection('loans', ref => 
        ref.where('userId', '==', this.currentUser!.uid)
      )
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (loans: any[]) => {
          console.log('Loans loaded from Firestore:', loans.length);
          
          // Sort loans by creation date (newest first)
          const sortedLoans = (loans as Loan[]).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          this.loans = sortedLoans;
          console.log('Loans assigned to component:', this.loans.length);
          
          // Trigger change detection
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading loans:', error);
          this.loans = [];
          this.presentToast('Failed to load loans. Please try again.');
          
          // Trigger change detection
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        }
      });

    this.subscriptions.push(loansSubscription);
  }

  // Simplified refresh method
  async refreshLoans(event: any) {
    console.log('Refreshing loans...');
    
    try {
      // Check if user is still authenticated
      const user = await this.afAuth.currentUser;
      if (!user) {
        console.log('User not authenticated during refresh');
        this.router.navigate(['/login']);
        return;
      }
      
      // Reload loans
      if (this.currentUser) {
        this.loadUserLoans();
      }
      
    } catch (error) {
      console.error('Error during refresh:', error);
      this.presentToast('Failed to refresh data');
    } finally {
      // Complete the refresh
      setTimeout(() => {
        event.target.complete();
      }, 1000);
    }
  }

  /**
   * Manual logout method
   */
  async logout() {
    try {
      await this.afAuth.signOut();
      console.log('User logged out successfully');
      // The auth state listener will handle navigation
    } catch (error) {
      console.error('Logout error:', error);
      this.presentToast('Error logging out');
    }
  }

  /**
   * Check if the page is still loading authentication
   */
  get isAuthLoading(): boolean {
    return this.authLoading;
  }

  /**
   * Check if user is authenticated and data is loaded
   */
  get isUserAuthenticated(): boolean {
    return !this.authLoading && this.currentUser !== null;
  }

  // Missing method: Get count of active loans
  getActiveLoansCount(): number {
    if (!this.loans || this.loans.length === 0) {
      return 0;
    }
    return this.loans.filter(loan => loan.status === 'active' || loan.status === 'approved').length;
  }

  // Missing method: Track by function for ngFor optimization
  trackByLoanId(index: number, loan: Loan): string {
    return loan.id || index.toString();
  }

  calculateMonthlyPayment(loan: Loan): number {
    if (!loan || loan.status === 'completed') return 0;
    
    const monthlyInterestRate = (loan.interestRate || 0) / 100 / 12;
    const totalAmount = (loan.amount || 0) * (1 + ((loan.interestRate || 0) / 100 * (loan.term || 0) / 12));
    const monthlyPayment = totalAmount / (loan.term || 1);
    
    return Math.round(monthlyPayment * 100) / 100; // Round to 2 decimal places
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

    if (remainingBalance <= 0) {
      await this.presentToast('This loan has been fully paid.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Payment Options',
      message: `
        <p><strong>Remaining Balance:</strong> R${remainingBalance.toFixed(2)}</p>
        <p><strong>Monthly Payment:</strong> R${monthlyPayment.toFixed(2)}</p>
      `,
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
        amount: Math.round(amount * 100), // Convert to cents
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
      // Create payment record
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

      // Save payment to payments collection
      await this.firestore.collection('payments').doc(paymentData.id).set(paymentData);

      // Update loan with payment information
      const newPayment: Payment = {
        id: paymentData.id,
        loanId: loan.id,
        amount: amount,
        dueDate: new Date(), // You might want to calculate proper due date
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

      // If fully paid, update loan status
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
    
    // Handle Firestore Timestamp
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