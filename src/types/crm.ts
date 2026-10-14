export type LeadSource = 'referral' | 'inbound' | 'cold_outreach' | 'ad';
export type Industry = 'tech' | 'finance' | 'healthcare' | 'retail' | 'education' | 'services';
export type LeadStatus = 'new' | 'contacted' | 'negotiation' | 'converted' | 'lost';

export interface Lead {
  id?: number;
  name: string;
  company: string;
  email: string;
  companySize: number;           // e.g. 5, 20, 100
  estimatedBudget: number;       // In USD ($)
  interactionCount: number;      // Meetings/emails
  hasNda: boolean;               // NDA signed
  decisionMakerInvolved: boolean;// Has direct C-level/VP access
  source: LeadSource;
  industry: Industry;
  score?: number;                // 0 - 100 AI calculated score
  conversionProbability?: number;// 0.00 - 1.00
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientType = 'enterprise' | 'startup' | 'agency' | 'individual';
export type InvoiceStatus = 'draft' | 'pending' | 'overdue' | 'paid';

export interface Invoice {
  id?: number;
  leadId?: number;
  clientName: string;
  clientType: ClientType;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  paymentTermDays: number;       // 15, 30, 45, 60
  priorLatePayments: number;     // Past delay count
  daysUntilDue: number;          // Calculated days
  disputedItems: boolean;        // Whether line items are disputed
  predictedLateDays?: number;    // Estimated days delayed by Edge AI
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical';
  status: InvoiceStatus;
  paidAt?: string;
}

export interface SecurityVaultStatus {
  isEncrypted: boolean;
  isLocked: boolean;
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  lastEncryptedAt?: string;
  zeroKnowledgeVerified: boolean;
}

export interface ModelEngineStatus {
  leadScoringReady: boolean;
  paymentPredictionReady: boolean;
  backend: 'WASM' | 'WebGPU' | 'HeuristicFallback';
  latencyMs: number;
  inferenceCount: number;
}
