import type { Lead, Invoice } from '../types/crm';
import { db } from './schema';

export const INITIAL_LEADS: Omit<Lead, 'id'>[] = [
  {
    name: 'Aarav Sharma',
    company: 'Apex Robotics Labs (Bengaluru)',
    email: 'aarav.sharma@apexrobotics.in',
    companySize: 65,
    estimatedBudget: 2850000, // ₹28,50,000
    interactionCount: 9,
    hasNda: true,
    decisionMakerInvolved: true,
    source: 'referral',
    industry: 'tech',
    score: 93,
    conversionProbability: 0.93,
    status: 'negotiation',
    notes: 'Requested custom AI pipeline for edge vision. Pre-approved budget in INR.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    name: 'Priya Mehra',
    company: 'Sterling & Vance Advisory (Mumbai)',
    email: 'pmehra@sterlingvance.co.in',
    companySize: 180,
    estimatedBudget: 3800000, // ₹38,00,000
    interactionCount: 6,
    hasNda: true,
    decisionMakerInvolved: true,
    source: 'inbound',
    industry: 'finance',
    score: 86,
    conversionProbability: 0.86,
    status: 'contacted',
    notes: 'Looking for a secure on-premise client communication portal with zero cloud leakage.',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    name: 'Dr. Rohan Deshmukh',
    company: 'BioPulse Health Technologies',
    email: 'r.deshmukh@biopulse.org.in',
    companySize: 35,
    estimatedBudget: 1750000, // ₹17,50,000
    interactionCount: 4,
    hasNda: false,
    decisionMakerInvolved: false,
    source: 'ad',
    industry: 'healthcare',
    score: 49,
    conversionProbability: 0.49,
    status: 'new',
    notes: 'Initial inquiry via LinkedIn campaign. Seeking HIPAA & DPDP India compliant CRM.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    name: 'Ananya Verma',
    company: 'Cobalt Retail Solutions',
    email: 'ananya@cobaltretail.in',
    companySize: 14,
    estimatedBudget: 350000, // ₹3,50,000
    interactionCount: 2,
    hasNda: false,
    decisionMakerInvolved: false,
    source: 'cold_outreach',
    industry: 'retail',
    score: 28,
    conversionProbability: 0.28,
    status: 'contacted',
    notes: 'Expressed mild interest in inventory optimization. Budget appears constrained.',
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    name: 'Vikramaditya Sen',
    company: 'OmniLearn Academics',
    email: 'vsen@omnilearn.ac.in',
    companySize: 240,
    estimatedBudget: 4500000, // ₹45,00,000
    interactionCount: 14,
    hasNda: true,
    decisionMakerInvolved: true,
    source: 'referral',
    industry: 'education',
    score: 96,
    conversionProbability: 0.96,
    status: 'converted',
    notes: 'Contract signed! Edge computing platform rollout commencing Q4.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export const INITIAL_INVOICES: Omit<Invoice, 'id'>[] = [
  {
    clientName: 'Apex Robotics Labs (Bengaluru)',
    clientType: 'enterprise',
    invoiceNumber: 'INV-2026-001',
    amount: 1150000, // ₹11,50,000
    issueDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    paymentTermDays: 30,
    priorLatePayments: 1,
    daysUntilDue: 10,
    disputedItems: false,
    predictedLateDays: 6,
    riskLevel: 'moderate',
    status: 'pending'
  },
  {
    clientName: 'Sterling & Vance Advisory (Mumbai)',
    clientType: 'enterprise',
    invoiceNumber: 'INV-2026-002',
    amount: 1800000, // ₹18,00,000
    issueDate: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    paymentTermDays: 30,
    priorLatePayments: 3,
    daysUntilDue: -10,
    disputedItems: true,
    predictedLateDays: 24,
    riskLevel: 'critical',
    status: 'overdue'
  },
  {
    clientName: 'OmniLearn Academics',
    clientType: 'enterprise',
    invoiceNumber: 'INV-2026-003',
    amount: 1450000, // ₹14,50,000
    issueDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    paymentTermDays: 30,
    priorLatePayments: 0,
    daysUntilDue: 15,
    disputedItems: false,
    predictedLateDays: 2,
    riskLevel: 'low',
    status: 'pending'
  },
  {
    clientName: 'Kite Digital Agency (Delhi)',
    clientType: 'agency',
    invoiceNumber: 'INV-2026-004',
    amount: 480000, // ₹4,80,000
    issueDate: new Date(Date.now() - 50 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    paymentTermDays: 30,
    priorLatePayments: 0,
    daysUntilDue: -20,
    disputedItems: false,
    predictedLateDays: 0,
    riskLevel: 'low',
    status: 'paid',
    paidAt: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0]
  }
];

export async function seedDatabaseIfEmpty() {
  const firstLead = await db.leads.toCollection().first();
  // If database is empty or still has old USD figures (< 100000), update to INR seed
  if (!firstLead || (firstLead.estimatedBudget && firstLead.estimatedBudget < 100000)) {
    console.log("Seeding privacy-preserving CRM data with Indian Rupee (₹) amounts...");
    await db.leads.clear();
    await db.invoices.clear();
    await db.leads.bulkAdd(INITIAL_LEADS);
    await db.invoices.bulkAdd(INITIAL_INVOICES);
    console.log("INR Seed data created successfully!");
  }
}
