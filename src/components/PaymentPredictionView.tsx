import { useState, useEffect } from 'react';
import { Plus, Search, ClockAlert, CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Invoice, ClientType, InvoiceStatus } from '../types/crm';
import { db } from '../db/schema';
import { predictPaymentDelay } from '../ai/inference';
import { formatINR } from '../utils/format';

interface PaymentPredictionViewProps {
  invoices: Invoice[];
  onRefresh: () => void;
}

export const PaymentPredictionView = ({ invoices, onRefresh }: PaymentPredictionViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for Live Payment Predictor (INR amounts)
  const [formClient, setFormClient] = useState('');
  const [formClientType, setFormClientType] = useState<ClientType>('enterprise');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formAmount, setFormAmount] = useState<number>(750000); // ₹7,50,000 default
  const [formTerms, setFormTerms] = useState<number>(30);
  const [formPriorLate, setFormPriorLate] = useState<number>(1);
  const [formDueDate, setFormDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [formDisputed, setFormDisputed] = useState<boolean>(false);
  const [formStatus, setFormStatus] = useState<InvoiceStatus>('pending');

  // Live Edge AI Predicted Delay
  const [simLateDays, setSimLateDays] = useState<number>(5);
  const [simRisk, setSimRisk] = useState<'low' | 'moderate' | 'high' | 'critical'>('low');
  const [simLatency, setSimLatency] = useState<number>(0);

  // Calculate live delay prediction when form parameters change
  useEffect(() => {
    let isCancelled = false;
    const runInference = async () => {
      try {
        const daysUntilDue = Math.round(
          (new Date(formDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const res = await predictPaymentDelay({
          amount: formAmount,
          paymentTermDays: formTerms,
          priorLatePayments: formPriorLate,
          daysUntilDue: daysUntilDue,
          disputedItems: formDisputed,
          clientType: formClientType
        });

        if (!isCancelled) {
          setSimLateDays(res.predictedLateDays);
          setSimRisk(res.riskLevel);
          setSimLatency(res.latencyMs);
        }
      } catch (err) {
        console.error("Payment delay inference error:", err);
      }
    };

    runInference();
    return () => { isCancelled = true; };
  }, [formAmount, formTerms, formPriorLate, formDueDate, formDisputed, formClientType]);

  const openNewModal = () => {
    const nextNum = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    setFormClient('');
    setFormClientType('enterprise');
    setFormInvoiceNumber(nextNum);
    setFormAmount(750000);
    setFormTerms(30);
    setFormPriorLate(1);
    setFormDueDate(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]);
    setFormDisputed(false);
    setFormStatus('pending');
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    const daysUntilDue = Math.round(
      (new Date(formDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const invData: Omit<Invoice, 'id'> = {
      clientName: formClient || 'Acme Solutions Ltd',
      clientType: formClientType,
      invoiceNumber: formInvoiceNumber || `INV-${Date.now()}`,
      amount: formAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: formDueDate,
      paymentTermDays: formTerms,
      priorLatePayments: formPriorLate,
      daysUntilDue: daysUntilDue,
      disputedItems: formDisputed,
      predictedLateDays: simLateDays,
      riskLevel: simRisk,
      status: formStatus
    };

    await db.invoices.add(invData);
    setIsModalOpen(false);
    onRefresh();
  };

  const handleMarkPaid = async (inv: Invoice) => {
    if (!inv.id) return;
    await db.invoices.update(inv.id, {
      status: 'paid',
      paidAt: new Date().toISOString().split('T')[0]
    });
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    onRefresh();
  };

  const handleDeleteInvoice = async (id?: number) => {
    if (!id) return;
    if (confirm("Delete this invoice record from local storage?")) {
      await db.invoices.delete(id);
      onRefresh();
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--brand-navy)' }}>Invoices & Cash Flow Risk Engine</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Local GBDT regression predicts payment delay days based on contract terms, invoice amount in ₹, and client history.
          </p>
        </div>

        <button className="btn-emerald" onClick={openNewModal}>
          <Plus size={16} />
          Create Invoice & Predict Delay
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search invoices by client name or invoice #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '6px 0', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Filter Status:</span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client Name & Profile</th>
                <th>Amount (₹)</th>
                <th>Terms</th>
                <th>Due Date</th>
                <th>Edge AI Predicted Delay</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    No invoice records found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const lateDays = inv.predictedLateDays || 0;
                  const riskLevel = inv.riskLevel || (lateDays > 14 ? 'high' : lateDays > 5 ? 'moderate' : 'low');

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-navy)' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>{inv.clientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                          {inv.clientType} {inv.disputedItems && '• ⚠️ Disputed items'}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-navy)' }}>
                        {formatINR(inv.amount)}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
                          Net-{inv.paymentTermDays}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{inv.dueDate}</div>
                        <div style={{ fontSize: '0.72rem', color: inv.daysUntilDue < 0 ? '#b91c1c' : 'var(--text-dim)', fontWeight: 600 }}>
                          {inv.daysUntilDue < 0 ? `${Math.abs(inv.daysUntilDue)} days overdue` : `${inv.daysUntilDue} days left`}
                        </div>
                      </td>
                      <td>
                        {inv.status === 'paid' ? (
                          <span style={{ fontSize: '0.82rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                            <CheckCircle2 size={14} /> Settled
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: lateDays > 12 ? '#b91c1c' : lateDays > 5 ? '#b45309' : '#047857'
                              }}
                            >
                              +{lateDays} days
                            </span>
                            <span
                              className={`status-tag ${
                                riskLevel === 'critical' ? 'overdue' : riskLevel === 'high' ? 'contacted' : 'paid'
                              }`}
                              style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                            >
                              {riskLevel} risk
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-tag ${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#00b874' }}
                              title="Mark invoice as paid"
                            >
                              <CheckCircle2 size={13} /> Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="btn-secondary"
                            style={{ padding: '6px 8px', color: '#ef4444' }}
                            title="Delete"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Invoice & Live AI Payment Delay Predictor */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockAlert size={20} color="#0072e6" />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-navy)' }}>Edge AI Payment Delay Predictor</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Robotics Labs (Bengaluru)"
                      value={formClient}
                      onChange={e => setFormClient(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client Profile</label>
                    <select value={formClientType} onChange={e => setFormClientType(e.target.value as ClientType)}>
                      <option value="enterprise">Enterprise (Corporate Bureaucracy)</option>
                      <option value="startup">Venture Startup</option>
                      <option value="agency">Agency / Design Studio</option>
                      <option value="individual">Individual / Sole Proprietor</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input
                      type="text"
                      required
                      value={formInvoiceNumber}
                      onChange={e => setFormInvoiceNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select value={formTerms} onChange={e => setFormTerms(Number(e.target.value))}>
                      <option value={15}>Net-15 (15 Days)</option>
                      <option value={30}>Net-30 (Standard 30 Days)</option>
                      <option value={45}>Net-45 (45 Days)</option>
                      <option value={60}>Net-60 (Enterprise 60 Days)</option>
                    </select>
                  </div>
                </div>

                {/* Amount Slider (INR) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Invoice Total (₹ INR)</label>
                    <span className="range-val" style={{ color: '#0072e6' }}>{formatINR(formAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="25000"
                    max="3000000"
                    step="25000"
                    className="range-slider"
                    value={formAmount}
                    onChange={e => setFormAmount(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    <span>₹25,000</span>
                    <span>₹15,00,000 (15L)</span>
                    <span>₹30,00,000 (30L)</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Prior Late Payments Count</label>
                      <span className="range-val">{formPriorLate} times</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      className="range-slider"
                      value={formPriorLate}
                      onChange={e => setFormPriorLate(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Disputed Items Checkbox */}
                <div style={{ margin: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formDisputed}
                      onChange={e => setFormDisputed(e.target.checked)}
                      style={{ accentColor: '#ef4444', width: '16px', height: '16px' }}
                    />
                    <span>Deliverable items currently have open review / dispute delay</span>
                  </label>
                </div>

                {/* Live Real-Time Edge AI Delay Predictor Box */}
                <div className="ai-sim-box" style={{ borderColor: simRisk === 'critical' || simRisk === 'high' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 114, 230, 0.35)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0072e6', fontSize: '0.85rem', fontWeight: 700 }}>
                      <ClockAlert size={16} />
                      <span>ONNX Edge Regressor Output</span>
                      <span style={{ fontSize: '0.72rem', background: '#ffffff', border: '1px solid rgba(0, 114, 230, 0.25)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                        {simLatency}ms
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-navy)', marginTop: '4px' }}>
                      {simLateDays === 0
                        ? 'Expected to Pay On-Time'
                        : `Estimated +${simLateDays} Days Past Due Date`}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Risk Assessment: <strong style={{ textTransform: 'capitalize', color: simRisk === 'critical' ? '#b91c1c' : simRisk === 'high' ? '#b45309' : '#047857' }}>{simRisk}</strong> cash flow impact.
                    </div>
                  </div>

                  <div className={`sim-score-circle ${simRisk === 'critical' || simRisk === 'high' ? 'low' : simRisk === 'moderate' ? 'medium' : 'high'}`}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800 }}>+{simLateDays}</span>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700 }}>DAYS</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-emerald">
                  <CheckCircle2 size={16} />
                  Record Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
