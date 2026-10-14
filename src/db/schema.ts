import Dexie, { type Table } from 'dexie';
import type { Lead, Invoice } from '../types/crm';

export class SmartlanceDatabase extends Dexie {
  leads!: Table<Lead>;
  invoices!: Table<Invoice>;

  constructor() {
    super('SmartlancePrivacyDB');
    this.version(1).stores({
      leads: '++id, email, company, status, score, source, industry, createdAt',
      invoices: '++id, leadId, invoiceNumber, clientName, status, dueDate, predictedLateDays'
    });
  }
}

export const db = new SmartlanceDatabase();
