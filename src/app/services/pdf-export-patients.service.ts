import { Injectable } from '@angular/core';
import { Patient } from '../shared/models/patient.model';
import { Facility } from '../shared/models/facility.model';
import { DateUtils } from '../shared/utils/date-utils';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { Timestamp } from 'firebase/firestore';
@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  

  
  constructor() { }


  /**
 * Add the Healixir logo with primary color background to the PDF
 * @param doc The PDF document
 * @param x X position in mm
 * @param y Y position in mm
 * @param width Width in mm
 * @param height Height in mm
 */
private addHealixirLogo(doc: jsPDF, x: number, y: number, width: number, height: number): void {
    // Add a colored circle as background
    doc.setFillColor(76, 175, 80); // Primary color - adjust if needed
    doc.circle(x + width/2, y + height/2, Math.max(width, height)/2, 'F');
    
    // Add the logo image from assets
    // The path should be relative to your deployment assets
    const logoPath = 'assets/logoIcon.png'; // Adjust to your actual path
    
    try {
      doc.addImage(logoPath, 'PNG', x, y, width, height);
    } catch (error) {
      console.error('Error adding logo image:', error);
      // Fallback to a simple text representation if image loading fails
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(width/2);
      doc.text('H', x + width/2, y + height/2 + width/6, { align: 'center' });
    }
  }
 // Add this utility function to convert Firestore Timestamp to Date
private convertTimestampToDate(timestamp: Date | Timestamp | string | undefined): Date | undefined {
    if (!timestamp) return undefined;
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return undefined;
  }
  
  /**
   * Format date to string
   * @param date The date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date | Timestamp | string | undefined): string {
    if (!date) return 'N/A';
    
    // Convert Timestamp to Date if necessary
    const dateObj = this.convertTimestampToDate(date);
    if (!dateObj) return 'N/A';
    
    // Format the date
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
  }
  
  /**
   * Generate a PDF for a single patient
   * @param patient The patient data
   * @param facility The facility data
   * @returns Promise that resolves with the generated PDF blob
   */

  
  /**
   * Format address to string
   * @param address The address object
   * @returns Formatted address string
   */
  private formatAddress(address: any): string {
    if (!address) return 'N/A';
    
    // Implement your address formatting logic here
    // Example implementation:
    const parts = [
      address.street,
      address.city,
      address.province,
      address.postalCode
    ].filter(part => part);
    
    return parts.join(', ');
  }
  
  /**
   * Generate a PDF containing multiple patient cards
   * @param patients Array of patients
   * @param facility The facility data
   * @returns Promise that resolves with the generated PDF blob
   */
  async generateMultiPatientPdf(patients: Patient[], facility: Facility): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set document properties
    doc.setProperties({
      title: 'Patient Cards',
      subject: 'Multiple Patient Information Cards',
      author: 'Healixir Patient Management System',
      creator: 'Healixir PMS'
    });
    
    // Add cover page
    this.addCoverPage(doc, patients, facility);
    
    // Add one patient per page
    for (let i = 0; i < patients.length; i++) {
      if (i > 0) {
        doc.addPage();
      } else {
        doc.addPage();
      }
      
      const patient = patients[i];
      
      // Simplified patient card
      await this.addPatientCardToPage(doc, patient, facility);
    }
    
    return doc.output('blob');
  }
  
  /**
   * Add a cover page to the PDF document
   */
  private addCoverPage(doc: jsPDF, patients: Patient[], facility: Facility): void {
    // Add logo
    doc.setFontSize(24);
    doc.setTextColor(76, 175, 80); // Primary color
    doc.text('HEALIXIR', 105, 40, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Patient Management System', 105, 50, { align: 'center' });
    
    // Document title
    doc.setFontSize(20);
    doc.setTextColor(60, 60, 60);
    doc.text('Patient Information Cards', 105, 80, { align: 'center' });
    
    // Facility info
    doc.setFontSize(12);
    doc.text(facility.name, 105, 100, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${facility.location.city}, ${facility.location.province}`, 105, 107, { align: 'center' });
    
    // Patient count
    doc.setFontSize(14);
    doc.text(`Total Patients: ${patients.length}`, 105, 125, { align: 'center' });
    
    // List of patients
    doc.setFontSize(10);
    let yPos = 140;
    doc.text('Patient List:', 20, yPos);
    yPos += 8;
    
    patients.forEach((patient, index) => {
      doc.text(`${index + 1}. ${patient.name} (ID: ${patient.patientId})`, 30, yPos);
      yPos += 7;
      
      // Add new page if we run out of space
      if (yPos > 270 && index < patients.length - 1) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });
  }
  
  /**
   * Add a patient card to the current page of the PDF
   */
  private async addPatientCardToPage(doc: jsPDF, patient: Patient, facility: Facility): Promise<void> {
    // Header
    doc.setFontSize(18);
    doc.setTextColor(76, 175, 80); // Primary color
    doc.text('PATIENT CARD', 105, 20, { align: 'center' });
    
    // Replace SVG logo with Healixir logo with primary color background
    this.addHealixirLogo(doc, 20, 15, 10, 10);
    
    // Small Healixir text (as platform, not facility)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('healixir', 33, 24);
    
    // Patient name
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(patient.name, 105, 32, { align: 'center' });
    
    
    
    // Card container
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(20, 40, 170, 220, 5, 5, 'FD');
    
    // Patient ID and basic info section
    doc.setFillColor(240, 240, 240);
    const headerColor = patient.gender === 'Male' ? [46, 125, 50] : [0, 137, 123];
    doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2], 0.1);
    doc.roundedRect(20, 40, 170, 25, 5, 5, 'FD');
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Patient ID:', 30, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.patientId, 80, 54);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Registered:', 130, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(patient.registeredAt), 170, 54);
    
    // QR Code
    if (patient.qrCode) {
      doc.addImage(patient.qrCode, 'PNG', 70, 75, 70, 70);
    } else {
     
    }
    
    // Patient details
    doc.setFontSize(10);
    let yPos = 155;
    
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('SA ID Number:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.saIdNumber || '', 80, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Date of Birth:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(patient.dob), 80, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Gender:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.gender, 80, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Number:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.contactNumber, 80, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatAddress(patient.address), 80, yPos);
    yPos += 20;
    
    // Next of kin
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXT OF KIN', 30, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.nextOfKin.name, 80, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Relationship:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.nextOfKin.relationship, 80, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Contact:', 30, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.nextOfKin.contactNumber, 80, yPos);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 255, { align: 'center' });
    doc.text(`Facility: ${facility.name}`, 105, 260, { align: 'center' });
  }
  async generatePatientPdf(patient: Patient, facility: Facility): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set document properties
    doc.setProperties({
      title: `Patient Card - ${patient.name}`,
      subject: 'Patient Information Card',
      author: 'Healixir Patient Management System',
      creator: 'Healixir PMS'
    });
    
    // Replace SVG logo with Healixir logo with primary color background
    this.addHealixirLogo(doc, 10, 10, 15, 15);
    
    doc.setFontSize(18);
    doc.setTextColor(76, 175, 80); // Primary color
    doc.text('HEALIXIR', 30, 15);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Patient Management System', 30, 22);
    
    // Facility info
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(facility.name, 30, 30);
    doc.setFontSize(8);
    doc.text(facility.location.street, 30, 35);
    doc.text(`${facility.location.city}, ${facility.location.province}, ${facility.location.postalCode}`, 30, 39);
    doc.text(`Tel: ${facility.contactPhone}`, 30, 43);
    
    // Horizontal separator
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 47, 200, 47);
    
    // Patient information section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('PATIENT INFORMATION', 10, 55);
    
   
    
    // Basic patient info
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(patient.name, 10, 65);
    
    // Patient details
    doc.setFontSize(10);
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(10, 70, 120, 60, 3, 3, 'FD');
    
    const details = [
      { label: 'Patient ID:', value: patient.patientId },
      { label: 'SA ID Number:', value: patient.saIdNumber || '' },
      { label: 'Date of Birth:', value: this.formatDate(patient.dob) },
      { label: 'Gender:', value: patient.gender },
      { label: 'Contact Number:', value: patient.contactNumber },
      { label: 'Address:', value: this.formatAddress(patient.address) },
      { label: 'Registered:', value: this.formatDate(patient.registeredAt) }
    ];
    
    let yPos = 78;
    details.forEach(detail => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(detail.label, 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(detail.value || '', 50, yPos);
      yPos += 7;
    });
    
    // Next of kin section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('NEXT OF KIN', 10, 142);
    doc.setFont('helvetica', 'normal');
    
    const kinDetails = [
      { label: 'Name:', value: patient.nextOfKin.name },
      { label: 'Relationship:', value: patient.nextOfKin.relationship },
      { label: 'Contact:', value: patient.nextOfKin.contactNumber },
      { label: 'Address:', value: this.formatAddress(patient.nextOfKin.address) }
    ];
    
    yPos = 150;
    kinDetails.forEach(detail => {
      doc.setFont('helvetica', 'bold');
      doc.text(detail.label, 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(detail.value || '', 50, yPos);
      yPos += 7;
    });
    
    // QR Code
    if (patient.qrCode) {
      doc.addImage(patient.qrCode, 'PNG', 140, 70, 50, 50);
    } else {
     
    }
    
    // Footer
    const footerY = 280;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, footerY - 5, 200, footerY - 5);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('This document is generated by Healixir Patient Management System', 10, footerY);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, footerY + 4);
    doc.text('Page 1 of 1', 180, footerY);
    
    return doc.output('blob');
  }
  

  
  /**
   * Add an SVG to the PDF document
   * @param doc The PDF document
   * @param svg The SVG string
   * @param x X position in mm
   * @param y Y position in mm
   * @param width Width in mm
   * @param height Height in mm
   */
  private async addSvgToDocument(doc: jsPDF, svg: string, x: number, y: number, width: number, height: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      
      // Use the imported svg2pdf directly instead of accessing it via window
      svg2pdf(svgElement, doc, {
        x: x,
        y: y,
        width: width,
        height: height
      })
      .then(() => {
        resolve();
      })
      .catch((error: Error) => {
        console.error('Error adding SVG to document:', error);
        reject(error);
      });
    });
  }


}