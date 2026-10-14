import { useState, useEffect } from 'react';
import { Plus, Search, Sparkles, X, CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Lead, LeadSource, Industry, LeadStatus } from '../types/crm';
import { db } from '../db/schema';
import { predictLeadScore } from '../ai/inference';
import { formatINR } from '../utils/format';

interface LeadScoringViewProps {
  leads: Lead[];
  onRefresh: () => void;
}

export const LeadScoringView = ({ leads, onRefresh }: LeadScoringViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form State for Live AI Simulator (INR amounts)
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompanySize, setFormCompanySize] = useState<number>(35);
  const [formBudget, setFormBudget] = useState<number>(1500000); // ₹15,00,000 default
  const [formInteractions, setFormInteractions] = useState<number>(6);
  const [formHasNda, setFormHasNda] = useState<boolean>(true);
  const [formDecisionMaker, setFormDecisionMaker] = useState<boolean>(true);
  const [formSource, setFormSource] = useState<LeadSource>('inbound');
  const [formIndustry, setFormIndustry] = useState<Industry>('tech');
  const [formStatus, setFormStatus] = useState<LeadStatus>('contacted');
  const [formNotes, setFormNotes] = useState('');

  // Live Edge AI Predicted Score
  const [simScore, setSimScore] = useState<number>(75);
  const [simProbability, setSimProbability] = useState<number>(0.75);
  const [simLatency, setSimLatency] = useState<number>(0);

  // Recalculate live ONNX score on input change
  useEffect(() => {
    let isCancelled = false;
    const runInference = async () => {
      try {
        const res = await predictLeadScore({
          companySize: formCompanySize,
          estimatedBudget: formBudget,
          interactionCount: formInteractions,
          hasNda: formHasNda,
          decisionMakerInvolved: formDecisionMaker,
          source: formSource,
          industry: formIndustry
        });
        if (!isCancelled) {
          setSimScore(res.score);
          setSimProbability(res.probability);
          setSimLatency(res.latencyMs);
        }
      } catch (err) {
        console.error("Inference error:", err);
      }
    };

    runInference();
    return () => { isCancelled = true; };
  }, [formCompanySize, formBudget, formInteractions, formHasNda, formDecisionMaker, formSource, formIndustry]);

  const openNewModal = () => {
    setEditingLead(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormCompanySize(35);
    setFormBudget(1500000);
    setFormInteractions(6);
    setFormHasNda(true);
    setFormDecisionMaker(true);
    setFormSource('inbound');
    setFormIndustry('tech');
    setFormStatus('contacted');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date().toISOString();
    const leadData: Omit<Lead, 'id'> = {
      name: formName || 'Prospect Lead',
      company: formCompany || 'New Enterprise',
      email: formEmail || 'contact@client.in',
      companySize: formCompanySize,
      estimatedBudget: formBudget,
      interactionCount: formInteractions,
      hasNda: formHasNda,
      decisionMakerInvolved: formDecisionMaker,
      source: formSource,
      industry: formIndustry,
      score: simScore,
      conversionProbability: simProbability,
      status: formStatus,
      notes: formNotes,
      createdAt: editingLead ? editingLead.createdAt : now,
      updatedAt: now
    };

    if (editingLead && editingLead.id) {
      await db.leads.update(editingLead.id, leadData);
    } else {
      await db.leads.add(leadData);
    }

    if (simScore >= 80 || formStatus === 'converted') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteLead = async (id?: number) => {
    if (!id) return;
    if (confirm("Delete this lead record from local storage?")) {
      await db.leads.delete(id);
      onRefresh();
    }
  };

  const handleAdvanceStatus = async (lead: Lead) => {
    if (!lead.id) return;
    const nextStatusMap: Record<LeadStatus, LeadStatus> = {
      new: 'contacted',
      contacted: 'negotiation',
      negotiation: 'converted',
      converted: 'converted',
      lost: 'contacted'
    };
    const nextStatus = nextStatusMap[lead.status];
    await db.leads.update(lead.id, { status: nextStatus, updatedAt: new Date().toISOString() });
    if (nextStatus === 'converted') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    onRefresh();
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header with Search and Add Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--brand-navy)' }}>Leads & AI Propensity Scoring</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Local Random Forest classifier evaluates deal conversion likelihood directly on your device.
          </p>
        </div>

        <button className="btn-emerald" onClick={openNewModal}>
          <Plus size={16} />
          New Lead & Live AI Evaluation
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search leads by name, company, or industry..."
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
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="negotiation">Negotiation</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead & Company</th>
                <th>Industry / Source</th>
                <th>Estimated Budget (₹)</th>
                <th>Touchpoints</th>
                <th>Edge AI Score</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    No leads found matching your search.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const score = lead.score || 50;
                  const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

                  return (
                    <tr key={lead.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{lead.company} • {lead.email}</div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--brand-navy)' }}>{lead.industry}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                          via {lead.source.replace('_', ' ')}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-navy)' }}>
                        {formatINR(lead.estimatedBudget)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{lead.interactionCount} calls</span>
                          {lead.hasNda && (
                            <span style={{ fontSize: '0.7rem', background: '#e6fcf4', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              NDA
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={`score-badge ${scoreClass}`} title={`${Math.round((lead.conversionProbability || 0.5) * 100)}% on-device conversion probability`}>
                          <Sparkles size={13} />
                          <span>{score} / 100</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-tag ${lead.status}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {lead.status !== 'converted' && (
                            <button
                              onClick={() => handleAdvanceStatus(lead)}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              title="Advance pipeline stage"
                            >
                              Advance <ArrowRight size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
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

      {/* Modal: Add Lead / Live AI Scoring Simulator */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#00b874" />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-navy)' }}>Live Edge AI Lead Evaluation</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLead}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Sterling"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Dynamics Ltd"
                      value={formCompany}
                      onChange={e => setFormCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@company.in"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Industry Sector</label>
                    <select value={formIndustry} onChange={e => setFormIndustry(e.target.value as Industry)}>
                      <option value="tech">Technology / AI / SaaS</option>
                      <option value="finance">Finance / Banking / Fintech</option>
                      <option value="healthcare">Healthcare / Biotech</option>
                      <option value="retail">E-Commerce / D2C Retail</option>
                      <option value="education">EdTech / Universities</option>
                      <option value="services">Professional Services</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Acquisition Channel</label>
                    <select value={formSource} onChange={e => setFormSource(e.target.value as LeadSource)}>
                      <option value="referral">Client Referral (Highest Conversion)</option>
                      <option value="inbound">Inbound Search / Organic Website</option>
                      <option value="ad">Paid Digital Advertising</option>
                      <option value="cold_outreach">Outbound Cold Campaign</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pipeline Stage</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value as LeadStatus)}>
                      <option value="new">New Inquiry</option>
                      <option value="contacted">Discovery Contacted</option>
                      <option value="negotiation">Proposal in Negotiation</option>
                      <option value="converted">Closed Won / Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>

                {/* Deal Size Slider (INR) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Estimated Budget (₹ INR)</label>
                    <span className="range-val" style={{ color: '#0072e6' }}>{formatINR(formBudget)}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="5000000"
                    step="50000"
                    className="range-slider"
                    value={formBudget}
                    onChange={e => setFormBudget(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    <span>₹50,000</span>
                    <span>₹25,00,000 (25L)</span>
                    <span>₹50,00,000 (50L)</span>
                  </div>
                </div>

                {/* Interactions & Company Size Sliders */}
                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Touchpoints / Calls</label>
                      <span className="range-val">{formInteractions}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      step="1"
                      className="range-slider"
                      value={formInteractions}
                      onChange={e => setFormInteractions(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Company Size (Employees)</label>
                      <span className="range-val">{formCompanySize}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="400"
                      step="5"
                      className="range-slider"
                      value={formCompanySize}
                      onChange={e => setFormCompanySize(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Checkboxes: NDA and Decision Maker */}
                <div style={{ display: 'flex', gap: '20px', margin: '14px 0', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formHasNda}
                      onChange={e => setFormHasNda(e.target.checked)}
                      style={{ accentColor: '#00b874', width: '16px', height: '16px' }}
                    />
                    <span>Mutual NDA Executed</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formDecisionMaker}
                      onChange={e => setFormDecisionMaker(e.target.checked)}
                      style={{ accentColor: '#0072e6', width: '16px', height: '16px' }}
                    />
                    <span>Direct Decision Maker Involved</span>
                  </label>
                </div>

                {/* Live Real-Time Edge AI Score Dial Box */}
                <div className="ai-sim-box">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00b874', fontSize: '0.85rem', fontWeight: 700 }}>
                      <Sparkles size={16} />
                      <span>ONNX Edge AI Live Inference</span>
                      <span style={{ fontSize: '0.72rem', background: '#ffffff', border: '1px solid rgba(0, 184, 116, 0.3)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                        {simLatency}ms
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-navy)', marginTop: '4px' }}>
                      {simScore >= 70 ? 'High Propensity to Convert' : simScore >= 40 ? 'Moderate Opportunity' : 'Low Conversion Likelihood'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Estimated {(simProbability * 100).toFixed(1)}% statistical probability of contract signing.
                    </div>
                  </div>

                  <div className={`sim-score-circle ${simScore >= 70 ? 'high' : simScore >= 40 ? 'medium' : 'low'}`}>
                    <span style={{ fontSize: '1.45rem', fontWeight: 800 }}>{simScore}</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>/ 100</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-emerald">
                  <CheckCircle2 size={16} />
                  Save Lead to Local DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
