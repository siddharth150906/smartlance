import { ShieldCheck, HardDrive, WifiOff, KeyRound, Sparkles } from 'lucide-react';

interface PrivacyBannerProps {
  totalRecords: number;
}

export const PrivacyBanner = ({ totalRecords }: PrivacyBannerProps) => {
  return (
    <div className="privacy-hero-banner">
      <div style={{ zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={20} color="#10b981" />
          <h4 style={{ fontSize: '1.1rem', color: '#ffffff' }}>
            Zero-Cloud Privacy Guarantee
          </h4>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '720px' }}>
          All customer contacts, interaction histories, deal budgets, and machine learning inferences execute exclusively in your browser session via WebAssembly. No telemetry, no cloud surveillance, and zero third-party tracking.
        </p>
      </div>

      <div className="privacy-pill-group" style={{ zIndex: 1 }}>
        <div className="privacy-pill highlight" title="Data never transmitted">
          <WifiOff size={14} />
          <span>Offline Capable</span>
        </div>
        <div className="privacy-pill highlight" title="Local IndexedDB storage">
          <HardDrive size={14} />
          <span>{totalRecords} Local Records</span>
        </div>
        <div className="privacy-pill highlight" title="Hardware-accelerated AES-GCM-256">
          <KeyRound size={14} />
          <span>AES-GCM-256 Ready</span>
        </div>
        <div className="privacy-pill highlight" title="ONNX Machine Learning on WebAssembly">
          <Sparkles size={14} />
          <span>0 Cloud Inferences</span>
        </div>
      </div>
    </div>
  );
};
