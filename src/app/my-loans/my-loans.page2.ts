import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Loan, Payment } from '../shared/models/loan.model';
import { User } from '../shared/models/user.model';
import { environment } from 'src/environments/environment';

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
  
  loans: Loan[] = [];
  currentUser: User | null = null;
  loading: boolean = true;
  
  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private modalController: ModalController
  ) { }

  async ngOnInit() {
    this.loadPaystackScript();
    this.loadCurrentUser();
    this.loadUserLoans();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
      document.body.appendChild(script);
    }
  }

  async loadCurrentUser() {
    const user = await this.afAuth.currentUser;
    if (user) {
      const userDoc = await this.firestore.collection('users').doc(user.uid).get().toPromise();
      if (userDoc && userDoc.exists) {
        const userData = userDoc.data() || {};
        this.currentUser = { uid: user.uid, ...userData } as User;
        console.log('Current user loaded:', this.currentUser);
      }
    }
  }

  loadUserLoans() {
    if (!this.currentUser) {
      this.loading = false;
      return;
    }

    const loansSubscription = this.firestore
      .collection('loans', ref => 
        ref.where('userId', '==', this.currentUser!.uid)
           .orderBy('createdAt', 'desc')
      )
      .snapshotChanges()
      .pipe(
        map(actions => 
          actions.map(a => {
            const data = a.payload.doc.data() as Loan;
            const id = a.payload.doc.id;
            const { id: _id, ...rest } = data;
            return { id, ...rest };
          })
        )
      )
      .subscribe(loans => {
        this.loans = loans;
        this.loading = false;
      });

    this.subscriptions.push(loansSubscription);
  }

  // Helper method to get active loans count
  getActiveLoansCount(): number {
    return this.loans.filter(loan => loan.status === 'active').length;
  }

  calculateMonthlyPayment(loan: Loan): number {
    if (loan.status === 'completed') return 0;
    
    const monthlyInterestRate = loan.interestRate / 100 / 12;
    const totalAmount = loan.amount * (1 + (loan.interestRate / 100 * loan.term / 12));
    const monthlyPayment = totalAmount / loan.term;
    
    return Math.round(monthlyPayment * 100) / 100; // Round to 2 decimal places
  }

  calculateRemainingBalance(loan: Loan): number {
    const totalAmount = loan.amount * (1 + (loan.interestRate / 100 * loan.term / 12));
    const totalPaid = loan.payments.reduce((sum, payment) => 
      payment.status === 'paid' ? sum + payment.amount : sum, 0
    );
    
    return Math.max(0, totalAmount - totalPaid);
  }

  calculateTotalDue(loan: Loan): number {
    return loan.amount * (1 + (loan.interestRate / 100 * loan.term / 12));
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

  async refreshLoans(event: any) {
    this.loadUserLoans();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}