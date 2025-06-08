// src/app/user-profile/user-profile.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { User } from '../shared/models/user.model';
import { KYC } from '../shared/models/kyc.model';

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

  async viewDocument(url: string, title: string) {
    try {
      // Check if it's an image or PDF
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
      const isPdf = /\.pdf$/i.test(url);

      if (isImage) {
        await this.viewImageDocument(url, title);
      } else if (isPdf) {
        await this.viewPdfDocument(url, title);
      } else {
        // For other file types, open in new tab/window
        window.open(url, '_blank');
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

  async viewPdfDocument(pdfUrl: string, title: string) {
    const alert = await this.alertController.create({
      header: title,
      message: `
        <div style="text-align: center;">
          <p>PDF Document</p>
          <ion-icon name="document-text" style="font-size: 48px; color: var(--ion-color-primary);"></ion-icon>
        </div>
      `,
      buttons: [
        {
          text: 'Open PDF',
          handler: () => {
            window.open(pdfUrl, '_blank');
          }
        },
        {
          text: 'Download',
          handler: () => {
            this.downloadDocument(pdfUrl, title);
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

  downloadDocument(url: string, filename: string) {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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