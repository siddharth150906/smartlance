import { IndianRupee, Target, Receipt, ClockAlert, ArrowUpRight, ShieldCheck, Cpu, Zap } from 'lucide-react';
import type { Lead, Invoice, ModelEngineStatus } from '../types/crm';
import { formatINR } from '../utils/format';

interface DashboardOverviewProps {
  leads: Lead[];
  invoices: Invoice[];
  engineStatus: ModelEngineStatus;
  onNavigateTab: (tab: 'leads' | 'invoices' | 'vault') => void;
}

export const DashboardOverview = ({
  leads,
  invoices,
  engineStatus,
  onNavigateTab
}: DashboardOverviewProps) => {
  // Calculations
  const totalPipelineValue = leads.reduce((acc, lead) => acc + (lead.estimatedBudget || 0), 0);
  const highScoringLeads = leads.filter(l => (l.score || 0) >= 70);
  const highScoringPct = leads.length > 0 ? Math.round((highScoringLeads.length / leads.length) * 100) : 0;

  const totalReceivables = invoices
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const atRiskInvoices = invoices.filter(
    inv => (inv.status === 'pending' || inv.status === 'overdue') && (inv.predictedLateDays || 0) > 7
  );
  const atRiskAmount = atRiskInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  // Score distribution counts
  const highCount = leads.filter(l => (l.score || 0) >= 70).length;
  const medCount = leads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 70).length;
  const lowCount = leads.filter(l => (l.score || 0) < 40).length;

  return (
    <div>
      {/* Top Metric Cards */}
      <div className="metrics-grid">
        {/* Metric 1 */}
        <div className="glass-panel metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-label">Pipeline Value</span>
              <div className="metric-icon-wrap" style={{ color: '#0072e6', background: 'rgba(0, 114, 230, 0.1)' }}>
                <IndianRupee size={20} />
              </div>
            </div>
            <div className="metric-value">{formatINR(totalPipelineValue)}</div>
          </div>
          <div className="metric-subtext" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#00b874', fontWeight: 700 }}>{leads.length} active leads</span>
            <span>in current pipeline</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-label">AI Qualified Rate</span>
              <div className="metric-icon-wrap" style={{ color: '#00b874', background: 'rgba(0, 184, 116, 0.1)' }}>
                <Target size={20} />
              </div>
            </div>
            <div className="metric-value">{highScoringPct}%</div>
          </div>
          <div className="metric-subtext">
            <span>{highScoringLeads.length} leads with high propensity (&ge;70 score)</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-label">Pending Receivables</span>
              <div className="metric-icon-wrap" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)' }}>
                <Receipt size={20} />
              </div>
            </div>
            <div className="metric-value">{formatINR(totalReceivables)}</div>
          </div>
          <div className="metric-subtext">
            <span>Outstanding invoices awaiting settlement</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-label">At-Risk Cash Flow</span>
              <div className="metric-icon-wrap" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                <ClockAlert size={20} />
              </div>
            </div>
            <div className="metric-value" style={{ color: atRiskAmount > 0 ? '#b91c1c' : 'var(--brand-navy)' }}>
              {formatINR(atRiskAmount)}
            </div>
          </div>
          <div className="metric-subtext">
            <span>{atRiskInvoices.length} invoices predicted delayed (&gt;7 days)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Analysis & Urgent Edge Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '26px' }}>
        {/* Lead Scoring Distribution */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>AI Lead Propensity Distribution</h3>
            <button
              onClick={() => onNavigateTab('leads')}
              style={{ background: 'transparent', color: '#0072e6', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All Leads <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* High */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>High Conversion Propensity (70 - 100)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{highCount} leads</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${leads.length ? (highCount / leads.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #00b874, #059669)', borderRadius: '4px' }}></div>
              </div>
            </div>

            {/* Medium */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#b45309', fontWeight: 700 }}>Moderate Propensity (40 - 69)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{medCount} leads</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${leads.length ? (medCount / leads.length) * 100 : 0}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
              </div>
            </div>

            {/* Low */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>Cold / Low Priority (&lt; 40)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{lowCount} leads</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${leads.length ? (lowCount / leads.length) * 100 : 0}%`, height: '100%', background: '#94a3b8', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '22px', padding: '14px', background: 'rgba(0, 114, 230, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 114, 230, 0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0a325c', fontSize: '0.82rem' }}>
              <Zap size={16} color="#0072e6" />
              <span><strong>Edge ML Inference:</strong> Predictions recalculate locally in milliseconds whenever deal budgets or client meetings are logged.</span>
            </div>
          </div>
        </div>

        {/* Edge AI Engine Specs */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Local AI Runtime Specifications</h3>
            <span className="privacy-badge">
              <ShieldCheck size={14} /> Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Execution Backend</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0072e6', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Cpu size={16} />
                WASM / SIMD
              </div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Latency</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#00b874', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                ~{engineStatus.latencyMs || 2} ms
              </div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Lead Scoring Model</span>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-navy)', marginTop: '4px' }}>
                Random Forest (84.1% Acc)
              </div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Payment Delay Model</span>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-navy)', marginTop: '4px' }}>
                GBDT Regressor (R² 0.80)
              </div>
            </div>
          </div>

          <div style={{ marginTop: '18px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Both models were trained offline in Python with Scikit-Learn using Rupee amounts, compiled with <code>skl2onnx</code>, and execute 100% locally via WebAssembly inside your browser with zero network dependencies.
          </div>
        </div>
      </div>

      {/* High Priority Alerts Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockAlert size={18} color="#f59e0b" />
          Attention Required: Delayed Payment Risk
        </h3>

        {atRiskInvoices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No delayed payment risks detected across your current invoices.
          </p>
        ) : (
          <div className="table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Profile</th>
                  <th>Amount (₹)</th>
                  <th>Due Date</th>
                  <th>Predicted Delay</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {atRiskInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>{inv.clientName}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontWeight: 600 }}>{inv.clientType}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-navy)' }}>
                      {formatINR(inv.amount)}
                    </td>
                    <td>{inv.dueDate}</td>
                    <td>
                      <span style={{ color: '#b91c1c', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        +{inv.predictedLateDays} days
                      </span>
                    </td>
                    <td>
                      <span className={`status-tag ${inv.riskLevel === 'critical' ? 'overdue' : 'contacted'}`}>
                        {inv.riskLevel}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => onNavigateTab('invoices')}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
