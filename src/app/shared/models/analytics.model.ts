// analytics.model.ts

export interface Analytics {
    id: string;
    facilityId: string;
    timeFrame: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
    dateGenerated: Date;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    
    // Patient metrics
    patientMetrics: PatientMetrics;
    
    // Clinical metrics
    clinicalMetrics: ClinicalMetrics;
    
    // Operational metrics
    operationalMetrics: OperationalMetrics;
    
    // Financial metrics
    financialMetrics: FinancialMetrics;
    
    // Resource utilization
    resourceUtilization: ResourceUtilization;
  }
  
  export interface PatientMetrics {
    totalPatients: number;
    newPatientRegistrations: number;
    activePatients: number;
    patientDemographics: {
      ageGroups: AgeGroupDistribution[];
      genderDistribution: GenderDistribution[];
    };
    patientSatisfactionScore?: number; // If collected
  }
  
  export interface AgeGroupDistribution {
    range: string; // e.g., "0-18", "19-35", "36-50", "51-65", "65+"
    count: number;
    percentage: number;
  }
  
  export interface GenderDistribution {
    gender: 'Male' | 'Female' | 'Other';
    count: number;
    percentage: number;
  }
  
  export interface ClinicalMetrics {
    topDiagnoses: DiagnosisMetric[];
    topProcedures: ProcedureMetric[];
    labTestsOrdered: number;
    radiologyTestsOrdered: number;
    prescriptionsIssued: number;
    referralsIssued: number;
    readmissionRate?: number; // For hospitals
    averageLengthOfStay?: number; // For inpatient facilities
  }
  
  export interface DiagnosisMetric {
    icd10Code: string;
    diagnosisName: string;
    count: number;
    percentage: number;
  }
  
  export interface ProcedureMetric {
    cptCode: string;
    procedureName: string;
    count: number;
    percentage: number;
  }
  
  export interface OperationalMetrics {
    averageWaitTime: number; // In minutes
    appointmentsScheduled: number;
    appointmentsCancelled: number;
    appointmentsCompleted: number;
    noShowRate: number; // Percentage
    staffProductivity: StaffProductivityMetric[];
  }
  
  export interface StaffProductivityMetric {
    staffCategory: 'Physicians' | 'Nurses' | 'Administrative' | 'Lab Technicians' | 'Other';
    patientsServed: number;
    averageTimePerPatient: number; // In minutes
  }
  
  export interface FinancialMetrics {
    totalRevenue: number;
    revenueByService: RevenueByServiceMetric[];
    outstandingPayments: number;
    insuranceClaimsSubmitted: number;
    insuranceClaimsRejected: number;
    averageClaimProcessingTime: number; // In days
  }
  
  export interface RevenueByServiceMetric {
    serviceCategory: string;
    amount: number;
    percentage: number;
  }
  
  export interface ResourceUtilization {
    roomUtilization: ResourceUtilizationMetric[];
    equipmentUtilization: ResourceUtilizationMetric[];
    inventoryStatus: InventoryStatusMetric[];
    bedOccupancyRate?: number; // For inpatient facilities
  }
  
  export interface ResourceUtilizationMetric {
    resourceId: string;
    resourceName: string;
    utilizationRate: number; // Percentage
    hoursInUse: number;
  }
  
  export interface InventoryStatusMetric {
    itemCategory: 'Medication' | 'Equipment' | 'Supplies';
    itemCount: number;
    itemsLowInStock: number;
    itemsOutOfStock: number;
    averageConsumptionRate: number; // Per day
  }