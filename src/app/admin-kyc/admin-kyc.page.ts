import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { User } from '../shared/models/user.model';
import { KYC } from '../shared/models/kyc.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-kyc',
  templateUrl: './admin-kyc.page.html',
  styleUrls: ['./admin-kyc.page.scss'],
})
export class AdminKycPage implements OnInit, OnDestroy {
  kycApplications: (KYC & { user?: User })[] = [];
  filteredApplications: (KYC & { user?: User })[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';
  loading: boolean = false;
  private subscriptions: Subscription[] = [];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' }
  ];

  constructor(
    private firestore: AngularFirestore,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private userProfileService: UserProfileService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.loadKycApplications();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Add trackBy function for better performance
  trackByKycId(index: number, item: KYC & { user?: User }): string {
    return item.id;
  }

  // Add methods to get filtered counts for stats
  getPendingCount(): number {
    return this.kycApplications.filter(app => app.status === 'pending').length;
  }

  getVerifiedCount(): number {
    return this.kycApplications.filter(app => app.status === 'verified').length;
  }

  getRejectedCount(): number {
    return this.kycApplications.filter(app => app.status === 'rejected').length;
  }

  async loadKycApplications() {
    this.loading = true;
    const loading = await this.loadingController.create({
      message: 'Loading KYC applications...'
    });
    await loading.present();

    try {
      // Get KYC applications
      const kycSub = this.firestore.collection<KYC>('kyc', ref => 
        ref.orderBy('submittedAt', 'desc')
      ).valueChanges({ idField: 'id' }).subscribe(async (kycData) => {
        
        // Get user data for each KYC application
        const applicationsWithUsers = await Promise.all(
          kycData.map(async (kyc) => {
            try {
              const userDoc = await this.firestore.collection('users').doc(kyc.userId).get().toPromise();
              const userData = userDoc?.data() as User;
              return { ...kyc, user: userData };
            } catch (error) {
              console.error('Error fetching user data for KYC:', kyc.id, error);
              return { ...kyc, user: undefined };
            }
          })
        );

        this.kycApplications = applicationsWithUsers;
        this.applyFilters();
        this.loading = false;
        await loading.dismiss();
      });

      this.subscriptions.push(kycSub);
    } catch (error) {
      console.error('Error loading KYC applications:', error);
      this.loading = false;
      await loading.dismiss();
      await this.showToast('Error loading KYC applications', 'danger');
    }
  }

  onSearchChange(event: any) {
  // For ion-searchbar, the value is in event.detail.value
    this.searchTerm = (event?.detail?.value ?? '').toLowerCase();
    this.applyFilters();
  }

  onStatusChange(event: any) {
  // For ion-select, the value is in event.detail.value
    this.selectedStatus = event?.detail?.value ?? 'all';
    this.applyFilters();
  }

  applyFilters() {
  // Start with all applications
    let filtered = [...this.kycApplications];

    // Apply search filter
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.trim();
      filtered = filtered.filter(app => {
        const userName = app.user?.name?.toLowerCase() ?? '';
        const userSurname = app.user?.surname?.toLowerCase() ?? '';
        const userEmail = app.user?.email?.toLowerCase() ?? '';
        const appId = app.id?.toLowerCase() ?? '';
        
        return userName.includes(searchLower) ||
              userSurname.includes(searchLower) ||
              userEmail.includes(searchLower) ||
              appId.includes(searchLower);
      });
    }

    // Apply status filter
    if (this.selectedStatus && this.selectedStatus !== 'all') {
      filtered = filtered.filter(app => app.status === this.selectedStatus);
    }

    this.filteredApplications = filtered;
    console.log('Filtered results:', this.filteredApplications.length);
  }

  // Add this method to reset filters
  async resetFilters() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'verified': return 'success';
      case 'rejected': return 'danger';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'verified': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  }

  async updateKycStatus(kyc: KYC, newStatus: 'verified' | 'rejected') {
    const alert = await this.alertController.create({
      header: `${newStatus === 'verified' ? 'Verify' : 'Reject'} KYC Application`,
      message: `Are you sure you want to ${newStatus === 'verified' ? 'verify' : 'reject'} this KYC application?`,
      inputs: newStatus === 'rejected' ? [{
        name: 'rejectionReason',
        type: 'textarea',
        placeholder: 'Please provide a reason for rejection...'
      }] : [],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: newStatus === 'verified' ? 'Verify' : 'Reject',
          handler: async (data) => {
            await this.performStatusUpdate(kyc, newStatus, data?.rejectionReason);
          }
        }
      ]
    });

    await alert.present();
  }

  private async performStatusUpdate(kyc: KYC, newStatus: 'verified' | 'rejected', rejectionReason?: string) {
    const loading = await this.loadingController.create({
      message: 'Updating KYC status...'
    });
    await loading.present();

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
        verifiedBy: 'current-admin-uid' // Replace with actual admin UID
      };

      if (newStatus === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      if (newStatus === 'verified') {
        updateData['idDocument.verifiedAt'] = new Date();
        updateData['idDocument.verifiedBy'] = 'current-admin-uid';
        updateData['proofOfResidence.verifiedAt'] = new Date();
        updateData['proofOfResidence.verifiedBy'] = 'current-admin-uid';
      }

      await this.firestore.collection('kyc').doc(kyc.id).update(updateData);
      
      await loading.dismiss();
      await this.showToast(`KYC application ${newStatus} successfully`, 'success');
    } catch (error) {
      console.error('Error updating KYC status:', error);
      await loading.dismiss();
      await this.showToast('Error updating KYC status', 'danger');
    }
  }

  async viewDocument(documentUrl: string, title: string) {
    const modal = await this.modalController.create({
      component: AdminPdfViewerModalComponent,
      componentProps: {
        pdfData: documentUrl,
        title: title
      }
    });
    
    await modal.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

@Component({
  selector: 'app-pdf-viewer-modal-alt',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="downloadPdf()" fill="clear">
            <ion-icon name="download-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="closeModal()" fill="clear">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="pdf-container">
        <object 
          [data]="safePdfUrl" 
          type="application/pdf"
          width="100%" 
          height="100%"
          *ngIf="safePdfUrl && !showError">
          <div class="pdf-fallback">
            <p>Your browser doesn't support PDF viewing.</p>
            <ion-button (click)="downloadPdf()" color="primary">
              <ion-icon name="download-outline" slot="start"></ion-icon>
              Download PDF
            </ion-button>
          </div>
        </object>
        
        <div *ngIf="!safePdfUrl || showError" class="pdf-error">
          <ion-icon name="document-text-outline" size="large"></ion-icon>
          <p>{{ errorMessage || 'Unable to display PDF' }}</p>
          <ion-button (click)="downloadPdf()" color="primary">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Download PDF
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .pdf-container {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    
    object {
      flex: 1;
      border: none;
    }
    
    .pdf-error, .pdf-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      text-align: center;
    }
    
    .pdf-error ion-icon {
      margin-bottom: 16px;
      color: var(--ion-color-medium);
    }
  `]
})
export class AdminPdfViewerModalComponent implements OnInit {
  pdfData: string = '';
  title: string = '';
  safePdfUrl: SafeResourceUrl | null = null;
  showError: boolean = false;
  errorMessage: string = '';

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPdf();
  }

  loadPdf() {
    try {
      if (this.pdfData) {
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfData);
      } else {
        this.showError = true;
        this.errorMessage = 'No PDF data available';
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError = true;
      this.errorMessage = 'Error loading PDF';
      this.showToast('Error loading PDF', 'danger');
    }
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  async downloadPdf() {
    try {
      const link = document.createElement('a');
      link.href = this.pdfData;
      link.download = `${this.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await this.showToast('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      await this.showToast('Download failed', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}