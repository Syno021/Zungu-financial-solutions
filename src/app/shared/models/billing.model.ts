//src/app/shared/models/billing.model.ts
export interface Billing {
    id: string;
    patientId: string;
    facilityId: string;
    services: BillingService[];
    totalAmount: number;
    paid: boolean;
    issuedAt: Date;
  }
  
  export interface BillingService {
    cptCode: string;
    description: string;
    cost: number;
  }
  