// src/app/shared/pipes/firestore-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'firestoreDate'
})
export class FirestoreDatePipe implements PipeTransform {
  constructor(private datePipe: DatePipe) {}

  transform(value: any, format: string = 'mediumDate'): string | null {
    if (!value) {
      return '';
    }
    
    // Handle Firestore timestamp objects
    const date = value && typeof value.toDate === 'function' ? value.toDate() : value;
    
    return this.datePipe.transform(date, format);
  }
}