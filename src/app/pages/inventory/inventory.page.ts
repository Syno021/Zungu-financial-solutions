import { Component, ViewChild , ElementRef ,OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ScannerUtils } from 'src/app/shared/utils/scanner.utils';
import { InventoryService } from 'src/app/services/inventory.service';
import { IInventoryItem } from 'src/app/shared/models/invetory';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingController, NavController } from '@ionic/angular';
import { Staff } from 'src/app/shared/models/staff.model';
import { Facility } from 'src/app/shared/models/facility.model';
import { Subscription } from 'rxjs';
import { take, filter } from 'rxjs/operators';
import { BrowserCodeReader , BarcodeFormat } from '@zxing/browser';
import { MultiFormatReader } from '@zxing/library';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss','./inventory1.page.scss'],
})
export class InventoryPage implements OnInit, OnDestroy {
  inventoryItems: IInventoryItem[] = [];
  scanning = false;
  isEditing = false;
  selectedItem: IInventoryItem | null = null;
  inventoryForm: FormGroup;
  showManualEntry = false;
  currentCategory: string = '';
  loading: boolean = false;
  userFacilityId: string = '';
  currentFacilityId: string = '';
  private authSubscription: Subscription | undefined;
  selectedItemForAdjustment: IInventoryItem | null = null;
  codeReader: any;
  private stream: any = null;
  @ViewChild('scannerVideo') scannerVideo!: ElementRef<HTMLVideoElement>;
  currentFacingMode: 'user' | 'environment' = 'environment';


  constructor(
    private inventoryService: InventoryService,
    private fb: FormBuilder,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController
  ) {
    this.inventoryForm = this.fb.group({
      barcode: ['', Validators.required],
      name: ['', Validators.required],
      category: ['MEDICATION', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      reorderLevel: [25, Validators.required],
      minStock: [10, Validators.required],
      maxStock: [1000, Validators.required],
      supplier: [''],
      location: [''],
      expirationDate: [null],
      condition: [''],
    });
  }

  ngOnInit() {
    // Subscribe to auth service to get current user and facility ID
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter(user => !!user) // Only proceed if we have a user
      )
      .subscribe(user => {
        if (user) {
          console.log('Current user type:', user.type);
          
          if (user.type === 'patient') {
            console.log('Patient attempted to access inventory page');
            // Log out patient from this page and redirect to home or login page
            this.logoutPatient();
            return; // Stop further execution
          }
          
          if (user.type === 'facility') {
            const facility = user.data as Facility;
            this.currentFacilityId = facility.facilityId;
            console.log('Facility ID detected:', this.currentFacilityId);
          } else if (user.type === 'staff') {
            const staff = user.data as Staff;
            this.currentFacilityId = staff.facilityId;
            console.log('Staff facility ID detected:', this.currentFacilityId);
          }
          // Load inventory after we have the facility ID
          this.loadInventory();
        } else {
          console.log('No authenticated user found');
        }
      });
  }

  // New method to handle patient logout
  async logoutPatient() {
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Redirecting...',
        duration: 1000
      });
      await loading.present();
      
      // Navigate away from the inventory page (redirect to home or login)
      this.navCtrl.navigateRoot('/home'); // or '/login' depending on your app structure
      
      // Optionally display a message about restricted access
      // This would require a toast controller or alert controller to be injected
    } catch (error) {
      console.error('Error during patient redirect:', error);
    }
  }

  async loadInventory() {
    try {
      this.loading = true;
      console.log('Loading inventory for facility ID:', this.currentFacilityId);
      
      if (this.currentFacilityId) {
        // Load inventory by facility ID and category
        this.inventoryItems = await this.inventoryService.getInventoryByFacility(this.currentFacilityId, this.currentCategory);
        console.log('Loaded facility-specific inventory items:', this.inventoryItems.length);
      } else {
        console.log('No facility ID available, loading all inventory');
        this.inventoryItems = await this.inventoryService.getInventoryByCategory(this.currentCategory || '');
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      this.loading = false;
    }
  }
 
  async filterByCategory(category: string) {
    try {
      this.loading = true;
      this.currentCategory = category;
      
      // Use the current facility ID when filtering by category
      if (this.currentFacilityId) {
        console.log(`Filtering ${category} items for facility: ${this.currentFacilityId}`);
        this.inventoryItems = await this.inventoryService.getInventoryByFacility(this.currentFacilityId, category);
      } else {
        console.log(`Filtering ${category} items (all facilities)`);
        this.inventoryItems = await this.inventoryService.getInventoryByCategory(category);
      }
      
      console.log("Filtered inventory:", this.inventoryItems);
    } catch (error) {
      console.error('Error filtering inventory:', error);
    } finally {
      this.loading = false;
    }
  }



async switchCamera() {
  this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
  this.cancelScanning();
  await this.startScanning();
}
  async startScanning() {
    try {
      const hasPermission = await this.checkCameraPermission();
      if (!hasPermission) {
        alert('Camera permission required');
        return;
      }
  
      // Create a reader instance first
      const reader = new MultiFormatReader();
      this.codeReader = new BrowserCodeReader(reader);
      this.scanning = true;
      
      const devices = await BrowserCodeReader.listVideoInputDevices();
      const deviceId = devices[0].deviceId;
  
      // Get video stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
            facingMode: this.currentFacingMode
        }
      });
  
      this.scannerVideo.nativeElement.srcObject = this.stream;
      
      this.codeReader.decodeFromVideoElement(
        this.scannerVideo.nativeElement,
        (result: any) => {
          if (result) {
            this.handleScan(result.getText());
            this.cancelScanning();
          }
        }
      );
  
    } catch (error) {
      console.error('Scanning failed:', error);
      this.cancelScanning();
    }
  }
  
  cancelScanning() {
    this.scanning = false;
    
    // Stop video stream
    if (this.stream) {
      this.stream.getTracks().forEach((track:any) => {
        track.stop();
        track.enabled = false;
      });
      this.stream = null;
    }
  
    // Reset code reader
    if (this.codeReader) {
      this.codeReader.reset();
      this.codeReader = null;
    }
  
    // Clear video element
    if (this.scannerVideo?.nativeElement) {
      this.scannerVideo.nativeElement.srcObject = null;
    }
  }
  

  private async checkCameraPermission(): Promise<boolean> {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      return true;
    } catch {
      return false;
    }
  }




  // Update handleScan method
  handleScan(result: any) {
    this.scanning = false;
    console.log('Scanned result:', result);
    
    // Process the scan result with facilityId
    this.inventoryService.scanAndAddItem(result, this.currentFacilityId)
      .then(() => this.loadInventory())
      .catch(error => console.error('Error adding scanned item:', error));
  }

  async submitForm() {
    if (this.inventoryForm.valid) {
      try {
        const formData = this.inventoryForm.value;
        
        if (this.isEditing && this.selectedItem) {
          await this.inventoryService.updateItem({
            ...this.selectedItem,
            ...formData
          });
        } else {
          // Add the current user's facilityId to the new item
          await this.inventoryService.addManualItem({
            ...formData,
            facilityId: [this.currentFacilityId] // Pass as array
          });
        }
        await this.loadInventory();
        this.cancelEdit();
      } catch (error) {
        console.error('Error saving item:', error);
      }
    }
  }

  async deleteItem(itemId: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await this.inventoryService.deleteItem(itemId);
        await this.loadInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  }

  editItem(item: IInventoryItem) {
    this.isEditing = true;
    this.selectedItem = item;
    this.inventoryForm.patchValue({
      ...item,
      expirationDate: item.expirationDate ? new Date(item.expirationDate).toISOString() : null
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.selectedItem = null;
    this.inventoryForm.reset();
    this.showManualEntry = false;
  }

  async adjustStock(itemId: string, quantity: number) {
    try {
      await this.inventoryService.updateStockLevel(
        itemId,
        Math.abs(quantity),
        quantity > 0 ? 'RESTOCK' : 'USAGE',
        'current-user-id',
        this.currentFacilityId
      );
      await this.loadInventory();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  }

  toggleManualEntry() {
    this.showManualEntry = !this.showManualEntry;
    if (!this.showManualEntry) {
      this.cancelEdit();
    }
  }

 

  // Add this method to select an item for adjustment
  selectItemForAdjustment(item: IInventoryItem) {
    this.selectedItemForAdjustment = item;
  }

  getStockLevelClass(item: IInventoryItem): string {
    if (item.quantity <= item.minStock) {
      return 'low';
    } else if (item.quantity <= item.reorderLevel) {
      return 'medium';
    } else {
      return 'good';
    }
  }

  // Add this method to calculate days until expiration
  getDaysUntilExpiration(expirationDate: string): number {
    if (!expirationDate) return 0;
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async quickAdjustStock(item: IInventoryItem, amount: number) {
    try {
      await this.inventoryService.updateStockLevel(
        item.id,
        Math.abs(amount),
        amount > 0 ? 'RESTOCK' : 'USAGE',
        'current-user-id',
        this.currentFacilityId
      );
      await this.loadInventory();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }


   // Updated equipment stats to count quantities, not just items
   get equipmentStats() {
    return this.inventoryItems
        .filter((item:any) => item.category === 'EQUIPMENT')
        .reduce(
            (acc:any, item:any) => {
                acc[item.condition || 'WORKING'] += item.quantity;
                return acc;
            },
            { WORKING: 0, NEEDS_REPAIR: 0, OUT_OF_SERVICE: 0 }
        );
}

get workingCount() {
    return this.equipmentStats.WORKING;
}
get needsRepairCount() {
    return this.equipmentStats.NEEDS_REPAIR;
}
get outOfServiceCount() {
    return this.equipmentStats.OUT_OF_SERVICE;
}

// Add supply stats
get supplyStats() {
    return this.inventoryItems
        .filter((item) => item.category === 'SUPPLY')
        .reduce(
            (acc, item) => {
                acc.totalItems++;
                acc.totalQuantity += item.quantity;
                acc.lowStock += item.quantity <= item.minStock ? 1 : 0;
                acc.needsReorder +=
                    item.quantity <= item.reorderLevel &&
                    item.quantity > item.minStock
                        ? 1
                        : 0;
                return acc;
            },
            {
                totalItems: 0,
                totalQuantity: 0,
                lowStock: 0,
                needsReorder: 0,
            }
        );
}

// Add medication stats
get medicationStats() {
    return this.inventoryItems
        .filter((item) => item.category === 'MEDICATION')
        .reduce(
            (acc, item) => {
                acc.totalItems++;
                acc.totalQuantity += item.quantity;
                acc.lowStock += item.quantity <= item.minStock ? 1 : 0;
                acc.needsReorder +=
                    item.quantity <= item.reorderLevel &&
                    item.quantity > item.minStock
                        ? 1
                        : 0;

                // Check for expiring medications (if expiration date is within 90 days)
                if (item.expirationDate) {
                    const daysToExpire = this.getDaysUntilExpiration(
                        item.expirationDate.toString()
                    );
                    if (daysToExpire <= 90 && daysToExpire > 0) {
                        acc.expiringSoon++;
                    }
                }

                return acc;
            },
            {
                totalItems: 0,
                totalQuantity: 0,
                lowStock: 0,
                needsReorder: 0,
                expiringSoon: 0,
            }
        );
}
}