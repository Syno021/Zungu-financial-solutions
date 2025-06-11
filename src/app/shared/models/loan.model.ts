// src/app/models/loan.model.ts
export interface Loan {
    id: string;
    userId: string;
    amount: number;
    interestRate: number;
    term: number; // in months
    purpose: string;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted';
    approvedBy?: string; // admin uid
    approvedAt?: Date;
    startDate?: Date;
    endDate?: Date;
    payments: Payment[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Payment {
    id: string;
    loanId: string;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'paid' | 'overdue';
    paidAt?: Date;
    transactionId?: string;
  }
