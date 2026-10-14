import { Cpu, Lock, Unlock, LayoutDashboard, Target, ReceiptText, ShieldAlert } from 'lucide-react';
import type { ModelEngineStatus, SecurityVaultStatus } from '../types/crm';

interface NavbarProps {
  currentTab: 'overview' | 'leads' | 'invoices' | 'vault';
  setCurrentTab: (tab: 'overview' | 'leads' | 'invoices' | 'vault') => void;
  engineStatus: ModelEngineStatus;
  vaultStatus: SecurityVaultStatus;
  onQuickLockToggle: () => void;
}

export const Navbar = ({
  currentTab,
  setCurrentTab,
  engineStatus,
  vaultStatus,
  onQuickLockToggle
}: NavbarProps) => {
  return (
    <header className="navbar">
      <div className="brand-section">
        {/* Real SmartLance Round Logo */}
        <img
          src="/smartlance_round_logo.png"
          alt="SmartLance Logo"
          className="brand-logo-img round"
        />
        <div className="brand-title-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">
              <span className="brand-title-smart">Smart</span>
              <span className="brand-title-lance">Lance</span>
            </span>
            <span className="brand-tag">EDGE CRM</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block' }}>
            AI-Powered • Privacy-First • Edge CRM
          </span>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-btn ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentTab('overview')}
        >
          <LayoutDashboard size={16} />
          Overview
        </button>
        <button
          className={`nav-btn ${currentTab === 'leads' ? 'active' : ''}`}
          onClick={() => setCurrentTab('leads')}
        >
          <Target size={16} />
          Leads & AI Scoring
        </button>
        <button
          className={`nav-btn ${currentTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setCurrentTab('invoices')}
        >
          <ReceiptText size={16} />
          Invoices & Cashflow
        </button>
        <button
          className={`nav-btn ${currentTab === 'vault' ? 'active' : ''}`}
          onClick={() => setCurrentTab('vault')}
        >
          <ShieldAlert size={16} />
          Zero-Knowledge Vault
        </button>
      </nav>

      <div className="nav-status">
        {/* On-Device Privacy Indicator */}
        <div className="privacy-badge" title="Zero data sent to cloud. 100% On-Device execution.">
          <span className="pulse-dot"></span>
          <span>100% On-Device</span>
        </div>

        {/* AI Engine Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            background: 'rgba(0, 114, 230, 0.08)',
            border: '1px solid rgba(0, 114, 230, 0.25)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            color: '#005bb5',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}
          title={`ONNX Runtime Web (${engineStatus.backend}). Latency: ~${engineStatus.latencyMs}ms. Inferences: ${engineStatus.inferenceCount}`}
        >
          <Cpu size={14} color="#0072e6" />
          <span>WASM AI ({engineStatus.latencyMs}ms)</span>
        </div>

        {/* Quick Vault Lock/Unlock */}
        <button
          onClick={onQuickLockToggle}
          style={{
            background: vaultStatus.isLocked ? '#fee2e2' : '#ffffff',
            border: `1px solid ${vaultStatus.isLocked ? '#f87171' : 'rgba(10, 50, 92, 0.16)'}`,
            color: vaultStatus.isLocked ? '#b91c1c' : 'var(--brand-navy)',
            padding: '7px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)'
          }}
          title={vaultStatus.isLocked ? 'Vault is Locked (Data masked)' : 'Vault is Unlocked'}
        >
          {vaultStatus.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          <span>{vaultStatus.isLocked ? 'Locked' : 'Unlocked'}</span>
        </button>
      </div>
    </header>
  );
};
