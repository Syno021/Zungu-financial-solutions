import { Directive, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { AddStaffService } from '../../services/add-staff.service';
import { Staff } from '../../shared/models/staff.model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

export enum StaffRegistrationType {
  MANUAL = 'manual',
  BATCH = 'batch'
}

export interface StaffRegistrationResult {
  successful: { staff: Staff, id: string }[];
  failed: { staff: Staff, error: string }[];
  validationErrors: { row: number, message: string }[];
}

@Directive({
  selector: '[appAddStaff]'
})
export class AddStaffDirective {
  @Input() registrationType: StaffRegistrationType = StaffRegistrationType.MANUAL;
  @Input() singleStaff: Staff | null = null;
  @Input() initialPassword: string = '';
  @Input() passwordGenerator: (staff: Staff) => string = (staff) => 
    `Temp${staff.name.replace(/\s+/g, '').substring(0, 5)}${Math.floor(Math.random() * 1000)}`;
  
  @Output() registrationComplete = new EventEmitter<StaffRegistrationResult>();
  @Output() registrationError = new EventEmitter<string>();
  @Output() templateGenerated = new EventEmitter<void>();
  
  private fileInput: HTMLInputElement | null = null;
  
  constructor(
    private el: ElementRef,
    private addStaffService: AddStaffService
  ) {
    // Create a hidden file input for Excel uploads
    this.createFileInput();
  }
  
  /**
   * Create a hidden file input element for Excel file selection
   */
  private createFileInput(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.xlsx,.xls';
    this.fileInput.style.display = 'none';
    this.el.nativeElement.appendChild(this.fileInput);
    
    // Add event listener for file selection
    this.fileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.processExcelFile(files[0]);
      }
    });
  }
  
  /**
   * Click event on the directive's element
   */
  @HostListener('click')
  onClick(): void {
    if (this.registrationType === StaffRegistrationType.MANUAL) {
      this.registerSingleStaff();
    } else {
      if (this.fileInput) {
        this.fileInput.click();
      }
    }
  }
  
  /**
   * Register a single staff member manually
   */
  registerSingleStaff(): void {
    if (!this.singleStaff) {
      this.registrationError.emit('No staff data provided');
      return;
    }
    
    this.addStaffService.addSingleStaff(this.singleStaff, this.initialPassword)
      .pipe(take(1))
      .subscribe({
        next: (staffId) => {
          if (staffId.startsWith('Error:')) {
            this.registrationError.emit(staffId);
          } else {
            const result: StaffRegistrationResult = {
              successful: [{ staff: { ...this.singleStaff as Staff, staffId }, id: staffId }],
              failed: [],
              validationErrors: []
            };
            this.registrationComplete.emit(result);
          }
        },
        error: (error) => {
          this.registrationError.emit(error.message);
        }
      });
  }
  
  /**
   * Process the selected Excel file
   */
  private processExcelFile(file: File): void {
    this.addStaffService.getCurrentFacilityId()
      .pipe(take(1))
      .subscribe({
        next: (facilityId) => {
          this.addStaffService.addStaffFromExcel(file, facilityId, this.passwordGenerator)
            .pipe(take(1))
            .subscribe({
              next: (result) => {
                this.registrationComplete.emit(result);
              },
              error: (error) => {
                this.registrationError.emit(`Error processing Excel file: ${error.message}`);
              }
            });
        },
        error: (error) => {
          this.registrationError.emit(`Could not determine facility ID: ${error.message}`);
        }
      });
  }
  
  /**
   * Generate an Excel template for staff registration
   */
  generateTemplate(): void {
    this.addStaffService.getCurrentFacilityId()
      .pipe(take(1))
      .subscribe({
        next: (facilityId) => {
          this.addStaffService.generateStaffTemplate(facilityId);
          this.templateGenerated.emit();
        },
        error: (error) => {
          this.registrationError.emit(`Could not generate template: ${error.message}`);
        }
      });
  }
  
  /**
   * Export current staff to Excel
   */
  exportCurrentStaff(): void {
    this.addStaffService.getCurrentFacilityId()
      .pipe(take(1))
      .subscribe({
        next: (facilityId) => {
          this.addStaffService.exportStaffToExcel(facilityId)
            .pipe(take(1))
            .subscribe({
              error: (error) => {
                this.registrationError.emit(`Error exporting staff: ${error.message}`);
              }
            });
        },
        error: (error) => {
          this.registrationError.emit(`Could not determine facility ID: ${error.message}`);
        }
      });
  }
}