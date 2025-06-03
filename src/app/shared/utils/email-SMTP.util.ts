import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EmailAttachment {
  file: File;
  filename: string;
}

export interface EmailRequest {
  to: string[];
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

export interface EmailResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost/user_api/send_email.php';

  constructor(private http: HttpClient) {}

  /**
   * Validates email addresses
   * @param emails Array of email addresses to validate
   * @returns boolean indicating if all emails are valid
   */
  private validateEmails(emails: string[]): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email.trim()));
  }

  /**
   * Validates file attachments
   * @param attachments Array of attachments to validate
   * @returns boolean indicating if all attachments are valid
   */
  private validateAttachments(attachments?: EmailAttachment[]): boolean {
    if (!attachments) return true;
    return attachments.every(attachment => 
      attachment.file instanceof File && 
      attachment.file.size > 0 &&
      attachment.filename.trim().length > 0
    );
  }

  /**
   * Sends an email with optional document attachments
   * @param emailData The email data including recipients, subject, body and attachments
   * @returns Observable of the API response
   */
  sendEmail(emailData: EmailRequest): Observable<EmailResponse> {

    console.log('Sending email data:', emailData);

    // Validate inputs
    if (!this.validateEmails(emailData.to)) {
      return throwError(() => new Error('Invalid email address(es)'));
    }

    if (!this.validateAttachments(emailData.attachments)) {
      return throwError(() => new Error('Invalid attachment(s)'));
    }

    const formData = new FormData();

    console.log('Recipients:', emailData.to);
    
    // Add email metadata
    formData.append('to', JSON.stringify(emailData.to));
    formData.append('subject', emailData.subject);
    formData.append('body', emailData.body);
    
    // Add attachments if any
    if (emailData.attachments?.length) {
      emailData.attachments.forEach((attachment, index) => {
        formData.append(`attachment${index}`, attachment.file, attachment.filename);
      });
      formData.append('attachmentCount', emailData.attachments.length.toString());
    }

    const formDataObj: Record<string, any> = {};
    formData.forEach((value, key) => {
      formDataObj[key] = value;
    });
    console.log('FormData contents:', formDataObj);

    return this.http.post<EmailResponse>(this.apiUrl, formData)
      .pipe(
        map(response => {
          console.log('Server response:', response); // Add response logging
          if (!response.success) {
            throw new Error(response.message || 'Failed to send email');
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Helper method to send a single document
   * @param to Recipients email addresses
   * @param subject Email subject
   * @param body Email body
   * @param file Document to attach
   * @param filename Custom filename for the attachment
   */
  sendDocument(
    to: string[],
    subject: string,
    body: string,
    file: File,
    filename?: string
  ): Observable<EmailResponse> {
    const emailData: EmailRequest = {
      to,
      subject,
      body,
      attachments: [{
        file,
        filename: filename || file.name
      }]
    };

    return this.sendEmail(emailData);
  }

  /**
   * Handles HTTP errors
   * @param error The HTTP error response
   * @returns An observable error with a user-friendly message
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred while sending the email.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}