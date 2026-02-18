
export type FormType = 'RECEIVING_LOG' | 'RAW_INTACT_MONITORING' | 'NR_RESPONSE';

export interface ReceivingLogEntry {
  id: string;
  type: 'RECEIVING_LOG';
  date: string;
  time: string;
  companyName: string;
  productDescription: string;
  lotNumber: string;
  invoiceNumber?: string;
  amount: string;
  temperature?: number;
  condition: string;
  documentationAvailable: ('LOG' | 'COA' | 'SDS')[];
  storedProperly: boolean;
  carNumber?: string;
  initials: string;
  timestamp: number;
}

export interface RawIntactMonitoringEntry {
  id: string;
  type: 'RAW_INTACT_MONITORING';
  date: string;
  lotNumber: string;
  product: string;
  monitoringTime: string;
  temperature: number;
  initials: string;
  verificationDO: boolean; // Direct Observation
  verificationRR: boolean; // Records Review
  verifierInitials: string;
  lotNumbersIncluded: string;
  preShipmentReview: boolean;
  lotHeld: boolean;
  comments: string;
  antimicrobialApplied: boolean;
  deviationOccurred: boolean;
  correctiveAction?: string;
  dispositionOfProduct?: string;
  supervisorReviewInitials?: string;
  timestamp: number;
}

export interface NRExtraction {
  regulationCited: string;
  ccpInvolved: string;
  criticalLimit: string;
  actualValues: string;
  deviationAmount: string;
  failureType: 'MONITORING' | 'DOCUMENTATION' | 'BOTH';
  numericCalculation: string;
}

export interface NRResponseDraft {
  immediateCorrectiveAction: string;
  productDisposition: string;
  rootCauseAnalysis: string;
  preventiveMeasures: string;
  verificationOfEffectiveness: string;
  citations: string[];
}

export type HACCPRecord = ReceivingLogEntry | RawIntactMonitoringEntry;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: Partial<HACCPRecord> | NRExtraction | NRResponseDraft;
}

export interface ComplianceTrend {
  date: string;
  avgTemp: number;
  deviations: number;
  missingLogs: number;
}
