import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/schema';
import { seedDatabaseIfEmpty } from './db/seedData';
import { initEdgeAI, engineStatus } from './ai/inference';
import type { SecurityVaultStatus, ModelEngineStatus } from './types/crm';

import { Navbar } from './components/Navbar';
import { PrivacyBanner } from './components/PrivacyBanner';
import { DashboardOverview } from './components/DashboardOverview';
import { LeadScoringView } from './components/LeadScoringView';
import { PaymentPredictionView } from './components/PaymentPredictionView';
import { PrivacyVaultView } from './components/PrivacyVaultView';
import { Lock } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'overview' | 'leads' | 'invoices' | 'vault'>('overview');
  const [modelsReady, setModelsReady] = useState<ModelEngineStatus>(engineStatus);
  const [vaultStatus, setVaultStatus] = useState<SecurityVaultStatus>({
    isEncrypted: localStorage.getItem('smartlance_is_encrypted') === 'true',
    isLocked: false,
    algorithm: 'AES-GCM-256',
    keyDerivation: 'PBKDF2-SHA256',
    iterations: 100000,
    zeroKnowledgeVerified: true
  });

  // Reactive queries from local Dexie.js IndexedDB
  const leads = useLiveQuery(() => db.leads.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];

  // Seed database and warm up Edge AI on startup
  useEffect(() => {
    const startup = async () => {
      await seedDatabaseIfEmpty();
      const status = await initEdgeAI();
      setModelsReady({ ...status });
    };
    startup();
  }, []);

  const handleQuickLockToggle = () => {
    if (vaultStatus.isLocked) {
      setCurrentTab('vault');
    } else {
      setVaultStatus(prev => ({ ...prev, isLocked: true }));
    }
  };

  const handleRefreshData = () => {
    // Dexie live queries update automatically
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        engineStatus={modelsReady}
        vaultStatus={vaultStatus}
        onQuickLockToggle={handleQuickLockToggle}
      />

      <main className="main-content">
        <PrivacyBanner totalRecords={leads.length + invoices.length} />

        {vaultStatus.isLocked && currentTab !== 'vault' ? (
          <div
            className="glass-panel"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b91c1c'
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--brand-navy)' }}>Cryptographic Vault is Locked</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '480px', fontSize: '0.9rem' }}>
              Client names, deal budgets (₹), and invoice details are currently encrypted at rest in local storage. Please unlock your vault using your master passphrase to resume.
            </p>
            <button className="btn-emerald" onClick={() => setCurrentTab('vault')}>
              Enter Master Passphrase to Unlock
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'overview' && (
              <DashboardOverview
                leads={leads}
                invoices={invoices}
                engineStatus={modelsReady}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'leads' && (
              <LeadScoringView leads={leads} onRefresh={handleRefreshData} />
            )}

            {currentTab === 'invoices' && (
              <PaymentPredictionView invoices={invoices} onRefresh={handleRefreshData} />
            )}

            {currentTab === 'vault' && (
              <PrivacyVaultView
                leads={leads}
                invoices={invoices}
                vaultStatus={vaultStatus}
                setVaultStatus={setVaultStatus}
                onRefreshData={handleRefreshData}
              />
            )}
          </>
        )}
      </main>

      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          padding: '18px 28px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--brand-navy)' }}>Smart<span style={{ color: 'var(--brand-teal)' }}>Lance</span> Edge CRM</span>
          <span>•</span>
          <span style={{ color: '#047857', fontWeight: 600 }}>100% Client-Side WebAssembly (ONNX Runtime Web)</span>
          <span>•</span>
          <span>IndexedDB Local-First Database</span>
          <span>•</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
