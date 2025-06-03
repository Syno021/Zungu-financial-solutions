// src/app/models/kyc.model.ts
export interface KYC {
    id: string;
    userId: string;
    status: 'pending' | 'verified' | 'rejected';
    idDocument: {
      url: string;
      verifiedAt?: Date;
      verifiedBy?: string; // admin uid
    };
    proofOfResidence: {
      url: string;
      verifiedAt?: Date;
      verifiedBy?: string; // admin uid
    };
    rejectionReason?: string;
    submittedAt: Date;
    updatedAt: Date;
  }