//src/app/shared/utils/scanner.utils.ts
import { BehaviorSubject, Observable } from 'rxjs';
import { BarcodeFormat } from '@zxing/library';
import { IInventoryItem } from '../models/invetory';
import { inject } from '@angular/core';
import { InventoryService } from 'src/app/services/inventory.service';
import * as JsBarcode from 'jsbarcode';

/**
 * Scanner Configuration and Types
 */
export interface ScannerConfig {
  formats?: BarcodeFormat[];
  isAutostart?: boolean;
  isTorchEnabled?: boolean;
  isFrontCamera?: boolean;
  tryHarder?: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

/**
 * Default scanner configuration
 */
const DEFAULT_CONFIG: ScannerConfig = {
  formats: [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX
  ],
  isAutostart: true,
  isTorchEnabled: false,
  isFrontCamera: false,
  tryHarder: true
};

/**
 * Scanner State Management
 */
export class ScannerState {
  private static instance: ScannerState;
  private hasPermission = new BehaviorSubject<boolean>(false);
  private isScanning = new BehaviorSubject<boolean>(false);
  private availableDevices = new BehaviorSubject<DeviceInfo[]>([]);
  private currentDevice = new BehaviorSubject<DeviceInfo | null>(null);
  private lastError = new BehaviorSubject<string | null>(null);

  private constructor() {}

  static getInstance(): ScannerState {
    if (!ScannerState.instance) {
      ScannerState.instance = new ScannerState();
    }
    return ScannerState.instance;
  }

  // Getters
  getHasPermission(): Observable<boolean> {
    return this.hasPermission.asObservable();
  }

  getIsScanning(): Observable<boolean> {
    return this.isScanning.asObservable();
  }

  getAvailableDevices(): Observable<DeviceInfo[]> {
    return this.availableDevices.asObservable();
  }

  getCurrentDevice(): Observable<DeviceInfo | null> {
    return this.currentDevice.asObservable();
  }

  getLastError(): Observable<string | null> {
    return this.lastError.asObservable();
  }

  // Setters
  setHasPermission(value: boolean): void {
    this.hasPermission.next(value);
  }

  setIsScanning(value: boolean): void {
    this.isScanning.next(value);
  }

  setAvailableDevices(devices: DeviceInfo[]): void {
    this.availableDevices.next(devices);
  }

  setCurrentDevice(device: DeviceInfo | null): void {
    this.currentDevice.next(device);
  }

  setLastError(error: string | null): void {
    this.lastError.next(error);
  }
}

/**
 * Scanner Utility Functions
 */
export const ScannerUtils = {
  /**
   * Initialize scanner with custom configuration
   */
  initializeScanner(config: Partial<ScannerConfig> = {}): ScannerConfig {
    return { ...DEFAULT_CONFIG, ...config };
  },

  /**
   * Handle successful scan result
   */
  handleSuccessfulScan(result: string): { data: string; timestamp: number } {
    return {
      data: result,
      timestamp: Date.now()
    };
  },

  /**
   * Handle scanner errors
   */
  handleError(error: any): void {
    const state = ScannerState.getInstance();
    let errorMessage: string;

    if (error?.name === 'NotAllowedError') {
      errorMessage = 'Camera permission was denied';
    } else if (error?.name === 'NotFoundError') {
      errorMessage = 'No camera device was found';
    } else if (error?.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use';
    } else {
      errorMessage = 'An unknown error occurred: ' + (error?.message || error);
    }

    state.setLastError(errorMessage);
    console.error('Scanner error:', errorMessage);
  },

  /**
   * Parse scan result based on format
   */
  parseScanResult(result: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(result);
    } catch {
      // If not JSON, try to determine format
      if (result.startsWith('http')) {
        return { type: 'url', value: result };
      } else if (/^[0-9]+$/.test(result)) {
        return { type: 'numeric', value: result };
      } else {
        return { type: 'text', value: result };
      }
    }
  },

  /**
   * Check if device has camera permission
   */
  async checkPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      ScannerState.getInstance().setHasPermission(true);
      return true;
    } catch {
      ScannerState.getInstance().setHasPermission(false);
      return false;
    }
  },

  /**
   * Get available camera devices
   */
  async getDevices(): Promise<DeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId}`,
          kind: device.kind
        }));
      
      ScannerState.getInstance().setAvailableDevices(videoDevices);
      return videoDevices;
    } catch (error) {
      ScannerUtils.handleError(error);
      return [];
    }
  }
};


// Add to src/app/shared/utils/scanner.utils.ts
// Add to src/app/shared/utils/scanner.utils.ts
export const InventoryScannerUtils = {
  scanResult: new BehaviorSubject<string>(''),
  
  async scanInventoryItem(): Promise<IInventoryItem> {
    const scannerState = ScannerState.getInstance();
    scannerState.setIsScanning(true);
    
    return new Promise((resolve, reject) => {
      const subscription = this.scanResult.subscribe(async (result: string) => {
        if (result) {
          try {
            const inventoryService = inject(InventoryService);
            const item = await inventoryService.scanAndAddItem(result);
            resolve(item);
          } catch (error) {
            reject(error);
          } finally {
            scannerState.setIsScanning(false);
            subscription.unsubscribe();
          }
        }
      });

      const errorSubscription = scannerState.getLastError().subscribe(error => {
        if (error) {
          reject(error);
          subscription.unsubscribe();
          errorSubscription.unsubscribe();
        }
      });
    });
  },

  generateBarcode(item: IInventoryItem): string {
    // Generate GS1-128 barcode compatible with SA healthcare standards
    const currentDate = new Date();
    const expiryDate = item.expirationDate || currentDate;
    
    const gs1Data = `(01)${item.barcode}(11)${this.formatDate(currentDate)}(17)${this.formatDate(expiryDate)}`;
    
    // Create a canvas element to render the barcode
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, gs1Data, {
      format: "CODE128",
      displayValue: true
    });
    
    // Return the barcode as a data URL
    return canvas.toDataURL("image/png");
  }
,
  formatDate(date: Date | undefined): string {
    if (!date) {
      // Handle undefined case
      return '000000'; // or some default value
    }
    return date.toISOString().slice(2, 10).replace(/-/g, '');
  }
};