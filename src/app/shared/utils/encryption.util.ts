import * as CryptoJS from 'crypto-js';

// You should store this in a secure configuration file
const SECRET_KEY = 'your-secure-key-at-least-32-chars-long';
const IV_LENGTH = 16;

/**
 * Generates a random initialization vector
 */
const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(IV_LENGTH).toString();
};

/**
 * Encrypts data using AES-256-CBC
 * @param data - Data to encrypt (can be object or string)
 * @returns Encrypted string with IV prepended
 */
export const encrypt = (data: any): string => {
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Generate a random IV
    const iv = generateIV();
    
    // Create key and iv as WordArray
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
    const ivWA = CryptoJS.enc.Hex.parse(iv);

    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(dataString, key, {
      iv: ivWA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Combine IV and encrypted data
    return iv + encrypted.toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypts AES-256-CBC encrypted data
 * @param encryptedData - Encrypted string with IV prepended
 * @returns Decrypted data (as string or parsed JSON)
 */
export const decrypt = (encryptedData: string): any => {
  try {
    // Extract IV and encrypted data
    const iv = encryptedData.slice(0, IV_LENGTH * 2); // *2 because hex
    const encrypted = encryptedData.slice(IV_LENGTH * 2);

    // Create key and iv as WordArray
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
    const ivWA = CryptoJS.enc.Hex.parse(iv);

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: ivWA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    // Try to parse as JSON if possible
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
};