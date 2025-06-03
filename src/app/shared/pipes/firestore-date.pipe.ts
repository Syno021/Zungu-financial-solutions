// src/app/shared/pipes/firestore-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'firestoreDate',
  pure: true
})
export class FirestoreDatePipe implements PipeTransform {
  constructor(private datePipe: DatePipe) {}

  transform(value: any, format: string = 'mediumDate'): string | null {
    if (!value) {
      return '';
    }
    
    let date: Date;
    
    // Handle different timestamp formats
    if (value && typeof value.toDate === 'function') {
      // Firestore Timestamp object
      date = value.toDate();
    } else if (value && value.seconds !== undefined && value.nanoseconds !== undefined) {
      // Raw timestamp object
      date = new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1000000));
    } else if (value instanceof Date) {
      // Already a Date object
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      // String or number timestamp
      date = new Date(value);
    } else {
      console.warn('FirestoreDatePipe: Unrecognized date format', value);
      return '';
    }
    
    // Check if date is valid before passing to DatePipe
    if (isNaN(date.getTime())) {
      console.warn('FirestoreDatePipe: Invalid date', value);
      return '';
    }
    
    return this.datePipe.transform(date, format);
  }
}