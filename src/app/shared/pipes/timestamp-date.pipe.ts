// src/app/shared/pipes/timestamp-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DateUtils } from '../utils/date-utils';

@Pipe({
  name: 'timestampDate'
})
export class TimestampDatePipe implements PipeTransform {
  transform(value: any, format: string = 'dd/MM/yyyy'): string | null {
    const date = DateUtils.toDate(value);
    if (!date) {
      return null;
    }
    
    // Format the date according to the provided format
    // You'd need to implement your own formatting or use a library
    // For simplicity, we'll return a basic formatted string here
    return date.toLocaleDateString();
  }
}