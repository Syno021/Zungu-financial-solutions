// Appointment and Scheduling
export interface IAppointment {
  patientId: string;
  practitionerId: string;
  patient: any; // Patient information map
  practitioner: {
    id: string;
    email: string;
    facilityId: string;
    name: string;
    phone: string;
    role: string;
    specialization: string;
  };
  appointmentType: AppointmentType;
  dateTime: Date;
  duration: number;
  status: AppointmentStatus;
  reason: string;
  notes: string;
  reminderSent: boolean;
}

export enum AppointmentType {
        CONSULTATION = 'CONSULTATION',
        FOLLOW_UP = 'FOLLOW_UP',
        PROCEDURE = 'PROCEDURE',
        VACCINATION = 'VACCINATION',
        SCREENING = 'SCREENING'
      }

export enum AppointmentStatus {
        SCHEDULED = 'SCHEDULED',
        CONFIRMED = 'CONFIRMED',
        CHECKED_IN = 'CHECKED_IN',
        IN_PROGRESS = 'IN_PROGRESS',
        COMPLETED = 'COMPLETED',
        CANCELLED = 'CANCELLED',
        NO_SHOW = 'NO_SHOW'
      }