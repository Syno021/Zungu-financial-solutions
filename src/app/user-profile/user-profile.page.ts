// src/app/user-profile/user-profile.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { User } from '../shared/models/user.model';
import { KYC } from '../shared/models/kyc.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
})
export class UserProfilePage implements OnInit, OnDestroy {
  user: User | null = null;
  kyc: KYC | null = null;
  loading = true;
  editMode = false;
  
  private subscription: Subscription = new Subscription();

  // Form data for editing
  editForm = {
    name: '',
    surname: '',
    gender: '',
    phoneNumber: '',
    bankAccount: ''
  };

  constructor(
    private userProfileService: UserProfileService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadUserProfile() {
    const loading = await this.loadingController.create({
      message: 'Loading profile...'
    });
    await loading.present();

    this.subscription.add(
      this.userProfileService.getCurrentUserProfile().subscribe({
        next: (data: UserProfileData) => {
          this.user = data.user;
          this.kyc = data.kyc;
          this.updateEditForm();
          this.loading = false;
          loading.dismiss();
        },
        error: async (error) => {
          console.error('Error loading profile:', error);
          this.loading = false;
          loading.dismiss();
          await this.showToast('Error loading profile', 'danger');
        }
      })
    );
  }

  updateEditForm() {
    if (this.user) {
      this.editForm = {
        name: this.user.name || '',
        surname: this.user.surname || '',
        gender: this.user.gender || '',
        phoneNumber: this.user.phoneNumber || '',
        bankAccount: this.user.bankAccount || ''
      };
    }
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    if (!this.editMode) {
      this.updateEditForm(); // Reset form if cancelling edit
    }
  }

  async saveProfile() {
    if (!this.user) return;

    const loading = await this.loadingController.create({
      message: 'Saving profile...'
    });
    await loading.present();

    try {
      await this.userProfileService.updateUserProfile(this.editForm);
      this.editMode = false;
      await this.showToast('Profile updated successfully', 'success');
      // Reload profile to get updated data
      this.loadUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      await this.showToast('Error updating profile', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  getKycStatusColor(): string {
    if (!this.kyc) return 'medium';
    
    switch (this.kyc.status) {
      case 'verified': return 'success';
      case 'rejected': return 'danger';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  getKycStatusText(): string {
    if (!this.kyc) return 'Not Submitted';
    
    switch (this.kyc.status) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Under Review';
      default: return 'Unknown';
    }
  }

  async showKycDetails() {
    if (!this.kyc) return;

    const alert = await this.alertController.create({
      header: 'KYC Details',
      message: `
        <strong>Status:</strong> ${this.getKycStatusText()}<br>
        <strong>Submitted:</strong> ${this.formatDate(this.kyc.submittedAt)}<br>
        <strong>Last Updated:</strong> ${this.formatDate(this.kyc.updatedAt)}<br>
        ${this.kyc.rejectionReason ? `<strong>Rejection Reason:</strong> ${this.kyc.rejectionReason}` : ''}
      `,
      buttons: [
        {
          text: 'View Documents',
          handler: () => {
            this.viewKycDocuments();
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async viewKycDocuments() {
    if (!this.kyc) return;

    const alert = await this.alertController.create({
      header: 'KYC Documents',
      message: 'Select which document you would like to view:',
      buttons: [
        {
          text: 'ID Document',
          handler: () => {
            if (this.kyc?.idDocument?.url) {
              this.viewDocument(this.kyc.idDocument.url, 'ID Document');
            } else {
              this.showToast('ID Document not available', 'warning');
            }
          }
        },
        {
          text: 'Proof of Residence',
          handler: () => {
            if (this.kyc?.proofOfResidence?.url) {
              this.viewDocument(this.kyc.proofOfResidence.url, 'Proof of Residence');
            } else {
              this.showToast('Proof of Residence not available', 'warning');
            }
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async viewDocument(base64Data: string, title: string) {
    try {
      // Check if it's base64 data
      if (base64Data.startsWith('data:')) {
        const isImage = base64Data.startsWith('data:image/');
        const isPdf = base64Data.startsWith('data:application/pdf');

        if (isImage) {
          await this.viewImageDocument(base64Data, title);
        } else if (isPdf) {
          await this.viewPdfDocumentInModal(base64Data, title);
        } else {
          // Try to determine by content or show generic document modal
          await this.viewPdfDocumentInModal(base64Data, title);
        }
      } else {
        // Handle regular URLs (legacy support)
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(base64Data);
        const isPdf = /\.pdf$/i.test(base64Data);

        if (isImage) {
          await this.viewImageDocument(base64Data, title);
        } else if (isPdf) {
          await this.viewPdfDocumentInModal(base64Data, title);
        } else {
          // For other file types, open in new tab/window
          window.open(base64Data, '_blank');
        }
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      await this.showToast('Error opening document', 'danger');
    }
  }

  async viewImageDocument(imageUrl: string, title: string) {
    const alert = await this.alertController.create({
      header: title,
      message: `
        <div style="text-align: center;">
          <img src="${imageUrl}" style="max-width: 100%; max-height: 400px; border-radius: 8px;" 
               onerror="this.onerror=null; this.src='assets/icons/document-error.png'; this.alt='Failed to load image';" />
        </div>
      `,
      buttons: [
        {
          text: 'Download',
          handler: () => {
            this.downloadDocument(imageUrl, title);
          }
        },
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async viewPdfDocumentInModal(pdfBase64: string, title: string) {
    const modal = await this.modalController.create({
      component: PdfViewerModalComponent,
      componentProps: {
        pdfData: pdfBase64,
        title: title
      },
      cssClass: 'pdf-modal'
    });

    await modal.present();
  }

  downloadDocument(data: string, filename: string) {
    try {
      if (data.startsWith('data:')) {
        // Handle base64 data
        const link = document.createElement('a');
        link.href = data;
        link.download = `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Handle regular URLs
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      this.showToast('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showToast('Download failed', 'danger');
    }
  }

  async submitKycDocuments() {
    const alert = await this.alertController.create({
      header: 'Submit KYC Documents',
      message: 'This will redirect you to the KYC submission page.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Continue',
          handler: () => {
            // Navigate to KYC submission page
            // You'll need to implement this navigation based on your routing
            console.log('Navigate to KYC submission');
            this.showToast('KYC submission feature coming soon', 'primary');
          }
        }
      ]
    });

    await alert.present();
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

  formatDate(date: Date | string | any): string {
    if (!date) return 'N/A';
    
    try {
      let dateObj: Date;
      
      // Handle different date formats
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date && typeof date === 'object') {
        // Handle Firestore Timestamp objects
        if (date.toDate && typeof date.toDate === 'function') {
          dateObj = date.toDate();
        } else if (date.seconds) {
          // Handle timestamp with seconds
          dateObj = new Date(date.seconds * 1000);
        } else {
          // Try to convert object to date
          dateObj = new Date(date.toString());
        }
      } else {
        // Fallback for other types
        dateObj = new Date(date);
      }

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date:', date);
        return 'Invalid Date';
      }

      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Original date:', date);
      return 'Invalid Date';
    }
  }
}

// PDF Viewer Modal Component
@Component({
  selector: 'app-pdf-viewer-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleViewMode()" fill="clear">
            <ion-icon [name]="viewMode === 'iframe' ? 'eye-outline' : 'document-outline'"></ion-icon>
          </ion-button>
          <ion-button (click)="downloadPdf()" fill="clear">
            <ion-icon name="download-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="closeModal()" fill="clear">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="pdf-content" [fullscreen]="true">
      <div class="pdf-container">
        <!-- Iframe Method -->
        <div *ngIf="viewMode === 'iframe' && safePdfUrl && !showError" class="pdf-iframe-container">
          <iframe 
            [src]="safePdfUrl" 
            class="pdf-iframe"
            frameborder="0"
            allowfullscreen>
          </iframe>
        </div>

        <!-- Object Method (Alternative) -->
        <div *ngIf="viewMode === 'object' && safePdfUrl && !showError" class="pdf-object-container">
          <object 
            [data]="safePdfUrl" 
            type="application/pdf"
            class="pdf-object">
            <div class="pdf-fallback">
              <p>PDF cannot be displayed in this browser.</p>
              <ion-button (click)="downloadPdf()" color="primary">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Download PDF
              </ion-button>
            </div>
          </object>
        </div>

        <!-- Embed Method (Another Alternative) -->
        <div *ngIf="viewMode === 'embed' && safePdfUrl && !showError" class="pdf-embed-container">
          <embed 
            [src]="safePdfUrl" 
            type="application/pdf" 
            class="pdf-embed">
        </div>

        <!-- Error State -->
        <div *ngIf="!safePdfUrl || showError" class="pdf-error">
          <ion-icon name="document-text-outline" size="large"></ion-icon>
          <p>{{ errorMessage || 'Unable to display PDF' }}</p>
          <p class="error-details" *ngIf="pdfData">
            <small>Data length: {{ pdfData.length }} characters</small><br>
            <small>Type: {{ getDataType() }}</small>
          </p>
          <div class="error-actions">
            <ion-button (click)="retryLoad()" color="secondary" fill="outline">
              <ion-icon name="refresh-outline" slot="start"></ion-icon>
              Retry
            </ion-button>
            <ion-button (click)="downloadPdf()" color="primary">
              <ion-icon name="download-outline" slot="start"></ion-icon>
              Download PDF
            </ion-button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="pdf-loading">
          <ion-spinner></ion-spinner>
          <p>Loading PDF...</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --pdf-modal-height: 90vh;
      --pdf-modal-width: 90vw;
    }

    .pdf-content {
      --background: #f5f5f5;
    }
    
    .pdf-container {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      min-height: calc(100vh - 56px); /* Account for header */
    }
    
    .pdf-iframe-container,
    .pdf-object-container,
    .pdf-embed-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin: 8px;
    }
    
    .pdf-iframe,
    .pdf-object,
    .pdf-embed {
      width: 100%;
      height: 100%;
      border: none;
      flex: 1;
      min-height: 70vh;
    }

    .pdf-iframe {
      background: white;
    }
    
    .pdf-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px 20px;
      text-align: center;
      background: white;
      border-radius: 8px;
      margin: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .pdf-error ion-icon {
      margin-bottom: 16px;
      color: var(--ion-color-medium);
    }

    .error-details {
      margin: 16px 0;
      color: var(--ion-color-medium);
      font-family: monospace;
    }

    .error-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 20px;
    }

    .pdf-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: white;
      border-radius: 8px;
      margin: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .pdf-loading ion-spinner {
      margin-bottom: 16px;
    }

    .pdf-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      padding: 20px;
      text-align: center;
      background: #f9f9f9;
      border-radius: 8px;
      margin: 20px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      :host {
        --pdf-modal-height: 95vh;
        --pdf-modal-width: 98vw;
      }
      
      .pdf-iframe-container,
      .pdf-object-container,
      .pdf-embed-container {
        margin: 4px;
      }
    }

    @media (min-width: 1200px) {
      :host {
        --pdf-modal-height: 85vh;
        --pdf-modal-width: 80vw;
      }
    }
  `]
})
export class PdfViewerModalComponent implements OnInit {
  pdfData: string = '';
  title: string = '';
  safePdfUrl: SafeResourceUrl | null = null;
  showError: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = true;
  viewMode: 'iframe' | 'object' | 'embed' = 'iframe';
  private blobUrl: string | null = null;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPdf();
  }

  ngOnDestroy() {
    // Clean up blob URL if created
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }

  loadPdf() {
    this.isLoading = true;
    this.showError = false;
    
    try {
      if (this.pdfData) {
        console.log('Loading PDF data:', {
          length: this.pdfData.length,
          type: this.getDataType(),
          startsWithDataUri: this.pdfData.startsWith('data:')
        });

        // Try blob URL method first (more reliable for PDFs)
        this.createBlobUrl();
      } else {
        this.showError = true;
        this.errorMessage = 'No PDF data available';
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError = true;
      this.errorMessage = 'Error loading PDF: ' + (error as Error).message;
      this.isLoading = false;
      this.showToast('Error loading PDF', 'danger');
    }
  }

  // Enhanced blob URL creation method
  private createBlobUrl() {
    try {
      let binaryData: Uint8Array;
      
      if (this.pdfData.startsWith('data:')) {
        // Handle base64 data URI
        const base64Data = this.pdfData.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid base64 data');
        }
        
        const binaryString = window.atob(base64Data);
        binaryData = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Handle direct base64 string
        const binaryString = window.atob(this.pdfData);
        binaryData = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }
      }
      
      const blob = new Blob([binaryData], { type: 'application/pdf' });
      this.blobUrl = URL.createObjectURL(blob);
      
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
      
      // Add viewer parameters for better display
      const viewerUrl = this.blobUrl + '#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH';
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
      
      this.isLoading = false;
      
      console.log('PDF loaded successfully:', {
        blobUrl: this.blobUrl,
        blobSize: blob.size
      });
      
    } catch (error) {
      console.error('Error creating blob URL:', error);
      
      // Fallback to direct data URI method
      this.fallbackToDataUri();
    }
  }

  private fallbackToDataUri() {
    try {
      console.log('Falling back to direct data URI method');
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfData);
      this.isLoading = false;
    } catch (error) {
      console.error('Fallback method also failed:', error);
      this.showError = true;
      this.errorMessage = 'Error processing PDF data: ' + (error as Error).message;
      this.isLoading = false;
    }
  }

  toggleViewMode() {
    const modes: Array<'iframe' | 'object' | 'embed'> = ['iframe', 'object', 'embed'];
    const currentIndex = modes.indexOf(this.viewMode);
    this.viewMode = modes[(currentIndex + 1) % modes.length];
    
    this.showToast(`Switched to ${this.viewMode} view`, 'primary');
  }

  retryLoad() {
    this.loadPdf();
  }

  getDataType(): string {
    if (this.pdfData.startsWith('data:application/pdf')) return 'PDF Data URI';
    if (this.pdfData.startsWith('data:')) return 'Data URI (Unknown type)';
    if (this.pdfData.length > 100 && !this.pdfData.includes(' ')) return 'Base64 String';
    return 'Unknown';
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

// Alternative Solution: PDF Viewer using object element instead of iframe
