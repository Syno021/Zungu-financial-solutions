//app/shared/utils/qr-generator.utils.ts
import type { QRCodeToDataURLOptions, QRCodeRenderersOptions } from 'qrcode';
import * as JsBarcode from 'jsbarcode';


export interface QROptions {
  width?: number;
  margin?: number;
  scale?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  version?: number;
}

const DEFAULT_QR_OPTIONS: QROptions = {
  width: 300,
  margin: 4,
  scale: 4,
  color: {
    dark: '#000000',
    light: '#ffffff'
  },
  errorCorrectionLevel: 'M',
};

export class QRGeneratorUtils {
  private static qrcode: typeof import('qrcode') | null = null;

  private static async loadQRCode() {
    if (!this.qrcode) {
      this.qrcode = await import('qrcode');
    }
    return this.qrcode;
  }

  static async generateQRDataURL(
    data: string,
    options: QROptions = {}
  ): Promise<string> {
    try {
      const qrcode = await this.loadQRCode();
      const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options } as QRCodeToDataURLOptions;
      return await qrcode.toDataURL(data, mergedOptions);
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static async generateQRSVG(
    data: string,
    options: QROptions = {}
  ): Promise<string> {
    try {
      const qrcode = await this.loadQRCode();
      const mergedOptions = {
        ...DEFAULT_QR_OPTIONS,
        ...options,
        type: 'svg'
      } as QRCodeRenderersOptions;
      return await qrcode.toString(data, mergedOptions);
    } catch (error) {
      console.error('QR Code SVG generation failed:', error);
      throw new Error('Failed to generate QR code SVG');
    }
  }

  static generateContactQR(contact: {
    name: string;
    phone?: string;
    email?: string;
    url?: string;
  }): Promise<string> {
    const vCard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      contact.phone ? `TEL:${contact.phone}` : '',
      contact.email ? `EMAIL:${contact.email}` : '',
      contact.url ? `URL:${contact.url}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\n');

    return this.generateQRDataURL(vCard);
  }

  static generateWifiQR(wifi: {
    ssid: string;
    password: string;
    encryption: 'WEP' | 'WPA' | 'none';
  }): Promise<string> {
    const wifiString = `WIFI:T:${wifi.encryption};S:${wifi.ssid};P:${wifi.password};;`;
    return this.generateQRDataURL(wifiString);
  }

  static generateLocationQR(location: {
    latitude: number;
    longitude: number;
    query?: string;
  }): Promise<string> {
    const locationString = location.query
      ? `geo:${location.latitude},${location.longitude}?q=${encodeURIComponent(location.query)}`
      : `geo:${location.latitude},${location.longitude}`;
    return this.generateQRDataURL(locationString);
  }
}


// barcode-generator.utils.ts


export interface BarcodeOptions {
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  text?: string;
  fontOptions?: string;
  font?: string;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
}

const DEFAULT_BARCODE_OPTIONS: BarcodeOptions = {
  format: 'CODE128',
  width: 2,
  height: 100,
  displayValue: true,
  fontSize: 20,
  margin: 10
};

export class BarcodeGeneratorUtils {
  private static jsBarcode: typeof JsBarcode | null = null;

  // Then modify the loadJsBarcode method
private static async loadJsBarcode() {
  if (!this.jsBarcode) {
    // Remove the .default
    this.jsBarcode = await import('jsbarcode');
  }
  return this.jsBarcode;
}

// And update the generateBarcodeDataURL method
static async generateBarcodeDataURL(
  data: string,
  options: BarcodeOptions = {}
): Promise<string> {
  try {
    const jsBarcode = await this.loadJsBarcode();
    const mergedOptions = { ...DEFAULT_BARCODE_OPTIONS, ...options };
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    
    // Use the library directly without trying to access default
    jsBarcode(canvas, data, mergedOptions);
    
    // Return as data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Barcode generation failed:', error);
    throw new Error('Failed to generate barcode');
  }
 }
}