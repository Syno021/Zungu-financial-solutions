// js/models/user.model.ts
// This file defines the User model for the application.
// It includes properties for user details, KYC documents, and role management.
export interface User {
    uid: string;
    name: string;
    surname: string;
    gender?: string;
    idNumber?: string;
    email: string;
    phoneNumber?: string;
    bankAccount?: string;
    kycDocs?: {
      idDocUrl: string;
      proofOfResidenceUrl: string;
    };
    role: 'user' | 'admin';
    createdAt: Date;
    updatedAt: Date;
  }