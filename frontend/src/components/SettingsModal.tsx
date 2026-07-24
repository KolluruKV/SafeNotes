import { useState, useEffect, useRef } from 'react';
import { profileApi, notesApi } from '../services/api';

type ViewMode = 'list' | 'small' | 'medium' | 'tiles' | 'thumb';

interface Props {
  onClose: () => void;
  showPreview: boolean;
  onShowPreviewChange: (v: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

const VIEW_MODES: { value: ViewMode; label: string; icon: JSX.Element }[] = [
  {
    value: 'list',
    label: 'List',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
        <rect x="2" y="3" width="16" height="2.5" rx="1"/>
        <rect x="2" y="8.75" width="16" height="2.5" rx="1"/>
        <rect x="2" y="14.5" width="16" height="2.5" rx="1"/>
      </svg>
    ),
  },
  {
    value: 'small',
    label: 'Small',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
        <rect x="2" y="2" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="2" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="2" width="3.5" height="3.5" rx="0.5"/>
        <rect x="2" y="7" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="7" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="7" width="3.5" height="3.5" rx="0.5"/>
        <rect x="2" y="12" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="12" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="12" width="3.5" height="3.5" rx="0.5"/>
      </svg>
    ),
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
        <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9.5" y="2" width="5" height="5" rx="1"/>
        <rect x="2" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    value: 'tiles',
    label: 'Tiles',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
        <rect x="2" y="2" width="7" height="7" rx="1"/>
        <rect x="11" y="2" width="7" height="7" rx="1"/>
        <rect x="2" y="11" width="7" height="7" rx="1"/>
        <rect x="11" y="11" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    value: 'thumb',
    label: 'Thumb',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
        <rect x="1" y="1" width="18" height="9" rx="1.5"/>
        <rect x="1" y="12" width="18" height="7" rx="1.5"/>
      </svg>
    ),
  },
];

export default function SettingsModal({ onClose, showPreview, onShowPreviewChange, viewMode, onViewModeChange }: Props) {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [address, setAddress] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [recoloring, setRecoloring] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewMode>(viewMode);
  const [previewOn, setPreviewOn] = useState(showPreview);
  const [openSection, setOpenSection] = useState<'display' | 'profile' | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    profileApi.get().then((res) => {
      setFirstName(res.data.firstName || '');
      setSurname(res.data.surname || '');
      setAddress(res.data.address || '');
    }).catch(() => {}).finally(() => setProfileLoading(false));
  }, []);

  const handleSaveDisplay = () => {
    onViewModeChange(selectedView);
    onShowPreviewChange(previewOn);
    localStorage.setItem('defaultViewMode', selectedView);
    localStorage.setItem('showPreview', String(previewOn));
    showToast('Display settings saved successfully!', true);
  };

  const handleRecolorAll = async () => {
    setRecoloring(true);
    try {
      const res = await notesApi.recolorAll();
      showToast(res.data.message || 'Notes recolored!', true);
    } catch {
      showToast('Failed to recolor notes. Please try again.', false);
    } finally {
      setRecoloring(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await profileApi.update({ firstName, surname, address });
      showToast('Profile saved successfully!', true);
    } catch {
      showToast('Failed to save profile. Please try again.', false);
    } finally {
      setProfileSaving(false);
    }
  };

  const toggle = (section: 'display' | 'profile') =>
    setOpenSection((s) => (s === section ? null : section));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`settings-toast${toast.ok ? ' ok' : ' err'}`}>{toast.msg}</div>
        )}

        {/* ── Display Accordion ── */}
        <div className="accordion">
          <button className="accordion-header" onClick={() => toggle('display')}>
            <span className="accordion-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Display
            </span>
            <svg className={`accordion-chevron${openSection === 'display' ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {openSection === 'display' && (
            <div className="accordion-body">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">Show description on tiles</span>
                  <span className="settings-row-sub">Preview note content inside tiles</span>
                </div>
                <span
                  className={`toggle-switch${previewOn ? ' on' : ''}`}
                  onClick={() => setPreviewOn((v) => !v)}
                  role="switch"
                  aria-checked={previewOn}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setPreviewOn((v) => !v)}
                >
                  <span className="toggle-knob" />
                </span>
              </div>

              <div className="settings-row settings-row--col">
                <span className="settings-row-label">Default tile view</span>
                <div className="settings-view-grid">
                  {VIEW_MODES.map((m) => (
                    <button
                      key={m.value}
                      className={`settings-view-btn${selectedView === m.value ? ' active' : ''}`}
                      onClick={() => setSelectedView(m.value)}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary settings-save-btn" onClick={handleSaveDisplay}>
                Save Display Settings
              </button>
              <button
                className="btn settings-save-btn"
                style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                onClick={handleRecolorAll}
                disabled={recoloring}
                title="Assign a unique color from a 64-color palette to every existing note"
              >
                {recoloring ? 'Recoloring…' : '🎨 Recolor All Existing Notes'}
              </button>
            </div>
          )}
        </div>

        {/* ── Profile Accordion ── */}
        <div className="accordion">
          <button className="accordion-header" onClick={() => toggle('profile')}>
            <span className="accordion-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </span>
            <svg className={`accordion-chevron${openSection === 'profile' ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {openSection === 'profile' && (
            <div className="accordion-body">
              {profileLoading ? (
                <p className="settings-loading">Loading…</p>
              ) : (
                <>
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" />
                  </div>
                  <div className="form-group">
                    <label>Surname</label>
                    <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Enter surname" />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" rows={3} />
                  </div>
                  <button className="btn btn-primary settings-save-btn" onClick={handleSaveProfile} disabled={profileSaving}>
                    {profileSaving ? 'Saving…' : 'Save Profile'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
