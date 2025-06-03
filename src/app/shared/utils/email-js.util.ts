import emailjs from '@emailjs/browser';

// Configure EmailJS with your credentials
const EMAIL_SERVICE_ID = 'service_1q81bzl';
const EMAIL_PUBLIC_KEY = 'xmsEiY-Qslnb6fSZE';
const EMAIL_FROM = 'synoivfour@gmail.com';

// Template IDs for different email types
const TEMPLATES = {
  WELCOME: 'template_6j0vslg',
  RESET_PASSWORD: 'template_reset_password_id',
  NOTIFICATION: 'template_notification_id',
} as const;

// Type for email parameters
interface EmailParams {
  email_to: string;
  to_name?: string;
  subject: string;
  from_name?: string;
  from_email?: string;
  message: string;
  [key: string]: any; // For any additional template parameters
}

class EmailService {
  private static instance: EmailService;

  private constructor() {
    // Initialize EmailJS with your public key
    emailjs.init(EMAIL_PUBLIC_KEY);
  }

  // Singleton pattern to ensure only one instance exists
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Generic send email method
  private async sendEmail(
    templateId: string,
    params: EmailParams
  ): Promise<void> {
    try {
      const emailParams = {
        ...params,
        from_email: params.from_email || EMAIL_FROM,
        reply_to: params.from_email || EMAIL_FROM,
      };

      await emailjs.send(
        EMAIL_SERVICE_ID,
        templateId,
        emailParams
      );
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Specific email methods
  public async sendWelcomeEmail(params: EmailParams): Promise<void> {
    return this.sendEmail(TEMPLATES.WELCOME, params);
  }

  public async sendPasswordResetEmail(params: EmailParams): Promise<void> {
    return this.sendEmail(TEMPLATES.RESET_PASSWORD, params);
  }

  public async sendNotificationEmail(params: EmailParams): Promise<void> {
    return this.sendEmail(TEMPLATES.NOTIFICATION, params);
  }
}

// Export a single instance
export const emailService = EmailService.getInstance();

// Usage example:
/*
await emailService.sendWelcomeEmail({
  to_email: 'user@example.com',
  to_name: 'John Doe',
  subject: 'Welcome to Our Platform!',
  from_name: 'Your Company',
  message: 'Welcome to our platform!'
});
*/

