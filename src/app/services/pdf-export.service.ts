import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EHR } from '../shared/models/ehr.model';
import { Prescription } from '../shared/models/prescription.model';
import { LabResult } from '../shared/models/labResult.model';
import { RadiologyResult } from '../shared/models/radiologyResult.model';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  // Healixir brand colors
  private readonly COLORS = {
    primary: '#2E7D32',    // Emerald Green
    secondary: '#00897B',  // Teal
    mint: '#A5D6A7',       // Mint
    mintLight: '#C8E6C9',  // Light Mint
    warning: '#FFD54F',    // Golden Yellow
    danger: '#D32F2F',     // Warm Red
    background: '#F5FAF6', // Subtle Mint Tint
    text: '#333333',       // Dark Text
    subtext: '#666666'     // Medium Text
  };

  constructor(private loadingController: LoadingController) {}

  /**
   * Main method to generate PDF from EHR data
   */
  async generateMedicalRecordPdf(
    ehr: EHR, 
    prescriptions: Prescription[], 
    labResults: LabResult[], 
    radiologyResults: RadiologyResult[]
  ): Promise<void> {
    // Show loading indicator
    const loading = await this.loadingController.create({
      message: 'Generating PDF...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      // Create new PDF document with patient info in filename
      const pdf = new jsPDF('p', 'mm', 'a4');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${ehr.surname}_${ehr.name}_HealixirMedicalRecord_${timestamp}.pdf`;
      
      // Set default styling
      pdf.setFont('helvetica');
      pdf.setFontSize(10);
      pdf.setTextColor(this.COLORS.text);
      
      // Add Healixir branding
      this.addBranding(pdf);
      
      // Add header with patient name
      this.addHeader(pdf, ehr);
      
      // Add sections
      let yPosition = 38;

      // Patient Information
      yPosition = this.addPatientInfo(pdf, ehr, yPosition);
      yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);

      // Medical History
      yPosition = this.addMedicalHistory(pdf, ehr, yPosition);
      yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);

      // Prescriptions
      yPosition = this.addPrescriptions(pdf, prescriptions, yPosition);
      yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);

      // Lab Results
      yPosition = this.addLabResults(pdf, labResults, yPosition);
      yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);

      // Radiology Results
      yPosition = this.addRadiologyResults(pdf, radiologyResults, yPosition);
      
      // Add footer with pagination
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        this.addFooter(pdf, i, pageCount);
      }

      // Save PDF
      pdf.save(filename);
    } finally {
      // Dismiss loading indicator
      await loading.dismiss();
    }
  }

  /**
   * Add Healixir branding to PDF
   */
  private addBranding(pdf: jsPDF): void {
    // Add background color
    pdf.setFillColor(this.COLORS.background);
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
    
    // Add logo placeholder
    pdf.setFillColor(this.COLORS.primary);
    pdf.rect(10, 10, 40, 10, 'F');
    
    // Add Healixir text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HEALIXIR', 30, 17, { align: 'center' });
    
    // Add tagline
    pdf.setTextColor(this.COLORS.subtext);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Empower. Access. Thrive.', 55, 15);
    
    // Reset text color
    pdf.setTextColor(this.COLORS.text);
  }

  /**
   * Add header to PDF
   */
  private addHeader(pdf: jsPDF, ehr: EHR): void {
    // Add colored banner
    pdf.setFillColor(this.COLORS.primary);
    pdf.rect(0, 25, pdf.internal.pageSize.getWidth(), 8, 'F');
    
    // Add header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEDICAL RECORD', 105, 31, { align: 'center' });
    
    // Add patient name
    pdf.setTextColor(this.COLORS.text);
    pdf.setFontSize(12);
    pdf.text(`${ehr.surname}, ${ehr.name}`, 105, 39, { align: 'center' });
    
    // Reset text color
    pdf.setTextColor(this.COLORS.text);
  }

  /**
   * Add patient information to PDF
   */
  private addPatientInfo(pdf: jsPDF, ehr: EHR, yPosition: number): number {
    // Section header
    this.addSectionHeader(pdf, 'PATIENT INFORMATION', yPosition);
    yPosition += 8;
    
    // Create info box
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(this.COLORS.mint);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(10, yPosition - 3, 190, 50, 3, 3, 'FD');
    
    // Personal Info - Left Column
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Personal Details', 15, yPosition);
    pdf.setFont('helvetica', 'normal');
    
    // Two column layout
    const leftCol = 15;
    const rightCol = 110;
    
    yPosition += 5;
    pdf.text(`Full Name: ${ehr.name} ${ehr.surname}`, leftCol, yPosition); 
    yPosition += 5;
    pdf.text(`Date of Birth: ${this.formatDate(ehr.dob)}`, leftCol, yPosition); 
    yPosition += 5;
    pdf.text(`Gender: ${ehr.gender}`, leftCol, yPosition); 
    yPosition += 5;
    pdf.text(`ID Number: ${ehr.saIdNumber || 'Not provided'}`, leftCol, yPosition); 
    yPosition += 5;
    pdf.text(`Email: ${ehr.email}`, leftCol, yPosition); 
    yPosition += 5;
    pdf.text(`Contact Number: ${ehr.contactNumber}`, leftCol, yPosition); 
    
    // Address - Right Column
    const addressY = yPosition - 25;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Address', rightCol, addressY);
    pdf.setFont('helvetica', 'normal');
    
    if (ehr.address) {
      pdf.text(`${ehr.address.street || ''}`, rightCol, addressY + 5);
      pdf.text(`${ehr.address.city || ''}, ${ehr.address.province || ''}`, rightCol, addressY + 10);
      pdf.text(`${ehr.address.postalCode || ''}, ${ehr.address.country || ''}`, rightCol, addressY + 15);
    } else {
      pdf.text('No address information available', rightCol, addressY + 5);
    }
    
    // Next of Kin box
    yPosition += 10;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(10, yPosition - 3, 190, 35, 3, 3, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Next of Kin', 15, yPosition);
    pdf.setFont('helvetica', 'normal');
    
    yPosition += 5;
    if (ehr.nextOfKin) {
      pdf.text(`Name: ${ehr.nextOfKin.name || 'Not provided'}`, 15, yPosition);
      pdf.text(`Relationship: ${ehr.nextOfKin.relationship || 'Not provided'}`, 110, yPosition);
      yPosition += 5;
      pdf.text(`Contact Number: ${ehr.nextOfKin.contactNumber || 'Not provided'}`, 15, yPosition);
      yPosition += 5;
      
      if (ehr.nextOfKin.address) {
        pdf.text('Address:', 15, yPosition);
        yPosition += 5;
        pdf.text(`${ehr.nextOfKin.address.street || ''}, ${ehr.nextOfKin.address.city || ''}`, 20, yPosition);
        yPosition += 5;
        pdf.text(`${ehr.nextOfKin.address.province || ''}, ${ehr.nextOfKin.address.country || ''}`, 20, yPosition);
      }
    } else {
      pdf.text('No next of kin information available', 15, yPosition);
    }
    
    yPosition += 10;
    return yPosition;
  }

  /**
   * Add medical history to PDF
   */
  private addMedicalHistory(pdf: jsPDF, ehr: EHR, yPosition: number): number {
    // Section header
    this.addSectionHeader(pdf, 'MEDICAL HISTORY', yPosition);
    yPosition += 8;
    
    // Check if medical history exists
    if (!ehr.medicalHistory) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('No medical history information available', 15, yPosition);
      return yPosition + 5;
    }
    
    // Conditions
    this.addSubsectionHeader(pdf, 'Conditions', yPosition);
    yPosition += 6;
    
    // Create conditions box
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(10, yPosition - 3, 190, 5 + (ehr.medicalHistory.conditions?.length || 0) * 15, 3, 3, 'FD');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (ehr.medicalHistory.conditions && ehr.medicalHistory.conditions.length > 0) {
      for (const condition of ehr.medicalHistory.conditions) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 25);
        
        // Condition name with colored dot
        pdf.setFillColor(this.COLORS.primary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${condition.name || 'Unnamed condition'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`ICD-10: ${condition.icd10Code || 'N/A'} | SNOMED: ${condition.snomedCode || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Diagnosed: ${this.formatDate(condition.diagnosedDate)} | Status: ${condition.status || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        if (condition.notes) {
          pdf.text(`Notes: ${condition.notes}`, 20, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }
    } else {
      pdf.text('No conditions recorded', 20, yPosition);
      yPosition += 5;
    }
    
    // Add similar styling for other subsections (Surgeries, Allergies, etc.)
    // For brevity, I'll only style the first subsection in detail
    // and keep the original formatting for the rest
    
    // Surgeries
    yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 10);
    this.addSubsectionHeader(pdf, 'Surgeries', yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (ehr.medicalHistory.surgeries && ehr.medicalHistory.surgeries.length > 0) {
      for (const surgery of ehr.medicalHistory.surgeries) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 25);
        
        // Surgery name with colored dot
        pdf.setFillColor(this.COLORS.secondary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${surgery.procedureName || 'Unnamed procedure'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`CPT Code: ${surgery.cptCode || 'N/A'} | Date: ${this.formatDate(surgery.performedDate)}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Surgeon: ${surgery.surgeon || 'N/A'} | Facility: ${surgery.facility || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        if (surgery.complications) {
          pdf.text(`Complications: ${surgery.complications}`, 20, yPosition);
          yPosition += 4;
        }
        if (surgery.notes) {
          pdf.text(`Notes: ${surgery.notes}`, 20, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }
    } else {
      pdf.text('No surgeries recorded', 20, yPosition);
      yPosition += 5;
    }
    
    // Allergies
    yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 10);
    this.addSubsectionHeader(pdf, 'Allergies', yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (ehr.medicalHistory.allergies && ehr.medicalHistory.allergies.length > 0) {
      for (const allergy of ehr.medicalHistory.allergies) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
      
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${allergy.allergen || 'Unnamed allergen'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`SNOMED: ${allergy.snomedCode || 'N/A'} | Reaction: ${allergy.reactionType || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Severity: ${allergy.severity || 'N/A'} | Diagnosed: ${this.formatDate(allergy.diagnosedDate)}`, 20, yPosition);
        yPosition += 4;
        if (allergy.notes) {
          pdf.text(`Notes: ${allergy.notes}`, 20, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }
    } else {
      pdf.text('No allergies recorded', 20, yPosition);
      yPosition += 5;
    }
    
    // Immunizations
    yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 10);
    this.addSubsectionHeader(pdf, 'Immunizations', yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (ehr.medicalHistory.immunizations && ehr.medicalHistory.immunizations.length > 0) {
      for (const immunization of ehr.medicalHistory.immunizations) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
        pdf.setFillColor(this.COLORS.secondary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${immunization.vaccineName || 'Unnamed vaccine'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`CPT Code: ${immunization.cptCode || 'N/A'} | Date: ${this.formatDate(immunization.administeredDate)}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Administered by: ${immunization.administeredBy || 'N/A'} | Site: ${immunization.site || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Lot #: ${immunization.lotNumber || 'N/A'} | Expiration: ${this.formatDate(immunization.expirationDate)}`, 20, yPosition);
        yPosition += 4;
        if (immunization.notes) {
          pdf.text(`Notes: ${immunization.notes}`, 20, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }
    } else {
      pdf.text('No immunizations recorded', 20, yPosition);
      yPosition += 5;
    }
    
    // Family History
    yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 10);
    this.addSubsectionHeader(pdf, 'Family History', yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (ehr.medicalHistory.familyHistory && ehr.medicalHistory.familyHistory.length > 0) {
      for (const item of ehr.medicalHistory.familyHistory) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
        pdf.setFillColor(this.COLORS.primary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.condition || 'Unnamed condition'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`ICD-10: ${item.icd10Code || 'N/A'} | Relationship: ${item.relationship || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        if (item.notes) {
          pdf.text(`Notes: ${item.notes}`, 20, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }
    } else {
      pdf.text('No family history recorded', 20, yPosition);
      yPosition += 5;
    }
    
    return yPosition;
  }

  /**
   * Add prescriptions to PDF
   */
  private addPrescriptions(pdf: jsPDF, prescriptions: Prescription[], yPosition: number): number {
    // Section header
    this.addSectionHeader(pdf, 'PRESCRIPTIONS', yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (prescriptions && prescriptions.length > 0) {
      for (const prescription of prescriptions) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
        // Add prescription box
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(this.COLORS.mintLight);
        pdf.roundedRect(10, yPosition - 3, 190, 18, 2, 2, 'FD');
        
        // Prescription name with colored dot
        pdf.setFillColor(this.COLORS.secondary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${prescription.medication || 'Unnamed medication'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Dosage: ${prescription.dosage || 'N/A'} | Duration: ${prescription.duration || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Issued Date: ${this.formatDate(prescription.issuedAt)} | Doctor ID: ${prescription.doctorId || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Prescription ID: ${prescription.prescriptionId || 'N/A'}`, 20, yPosition);
        yPosition += 6;
      }
    } else {
      pdf.text('No prescriptions recorded', 15, yPosition);
      yPosition += 5;
    }
    
    return yPosition;
  }

  /**
   * Add lab results to PDF
   */
  private addLabResults(pdf: jsPDF, labResults: LabResult[], yPosition: number): number {
    // Section header
    this.addSectionHeader(pdf, 'LABORATORY RESULTS', yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (labResults && labResults.length > 0) {
      for (const labResult of labResults) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
        // Add lab result box
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(this.COLORS.mintLight);
        pdf.roundedRect(10, yPosition - 3, 190, 18, 2, 2, 'FD');
        
        // Lab result name with colored dot
        pdf.setFillColor(this.COLORS.primary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${labResult.testName || 'Unknown Test'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Result: ${labResult.result || 'N/A'} | LOINC Code: ${labResult.loincCode || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Ordered By: ${labResult.orderedBy || 'N/A'} | Issued Date: ${this.formatDate(labResult.issuedAt)}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Lab Order ID: ${labResult.laborderId || 'N/A'}`, 20, yPosition);
        yPosition += 6;
      }
    } else {
      pdf.text('No laboratory results recorded', 15, yPosition);
      yPosition += 5;
    }
    
    return yPosition;
  }

  /**
   * Add radiology results to PDF
   */
  private addRadiologyResults(pdf: jsPDF, radiologyResults: RadiologyResult[], yPosition: number): number {
    // Section header
    this.addSectionHeader(pdf, 'RADIOLOGY RESULTS', yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (radiologyResults && radiologyResults.length > 0) {
      for (const radiologyResult of radiologyResults) {
        yPosition = this.addPageBreakIfNeeded(pdf, yPosition, 20);
        
        // Add radiology result box
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(this.COLORS.mintLight);
        pdf.roundedRect(10, yPosition - 3, 190, 18, 2, 2, 'FD');
        
        // Radiology result name with colored dot
        pdf.setFillColor(this.COLORS.secondary);
        pdf.circle(15, yPosition - 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${radiologyResult.scanType || 'Unknown Scan'}`, 18, yPosition);
        
        yPosition += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Findings: ${radiologyResult.findings || 'N/A'}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Ordered By: ${radiologyResult.orderedBy || 'N/A'} | Issued Date: ${this.formatDate(radiologyResult.issuedAt)}`, 20, yPosition);
        yPosition += 4;
        pdf.text(`Radiology ID: ${radiologyResult.radiologyId || 'N/A'}`, 20, yPosition);
        yPosition += 6;
      }
    } else {
      pdf.text('No radiology results recorded', 15, yPosition);
      yPosition += 5;
    }
    
    return yPosition;
  }

  /**
   * Add section header to PDF
   */
  private addSectionHeader(pdf: jsPDF, title: string, yPosition: number): void {
    pdf.setDrawColor(this.COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.line(10, yPosition, 200, yPosition);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(this.COLORS.primary);
    pdf.text(title, 10, yPosition + 5);
    
    pdf.setTextColor(this.COLORS.text);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Add subsection header to PDF
   */
  private addSubsectionHeader(pdf: jsPDF, title: string, yPosition: number): void {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(this.COLORS.secondary);
    pdf.text(title, 10, yPosition);
    
    pdf.setTextColor(this.COLORS.text);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Add footer to PDF
   */
  private addFooter(pdf: jsPDF, currentPage: number, totalPages: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add line separator
    pdf.setDrawColor(this.COLORS.mint);
    pdf.setLineWidth(0.5);
    pdf.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);
    
    // Add page number
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(this.COLORS.subtext);
    pdf.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 20, pageHeight - 10);
    
    // Add disclaimer
    pdf.setFont('helvetica', 'italic');
    pdf.text('This document is confidential and contains personal health information.', 10, pageHeight - 15);
    pdf.text('Generated by Healixir EHR System', 10, pageHeight - 10);
    
    // Reset styles
    pdf.setTextColor(this.COLORS.text);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Check if we need to add a page break
   */
  private addPageBreakIfNeeded(pdf: jsPDF, currentY: number, requiredSpace: number): number {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (currentY + requiredSpace > pageHeight - 20) {
      pdf.addPage();
      return 20; // Reset Y position to top of new page with margin
    }
    return currentY;
  }

  /**
   * Format date for display
   */
  private formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }
}