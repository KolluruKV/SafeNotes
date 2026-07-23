import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ADMIN_MODULES = [
  {
    id: 'users',
    icon: '👥',
    label: 'Users',
    description: 'Manage accounts, status & permissions',
    path: '/admin/users',
    color: '#3b9eff',
    ready: true,
  },
  {
    id: 'reports',
    icon: '📊',
    label: 'Reports',
    description: 'App statistics and activity metrics',
    path: '/admin/reports',
    color: '#10d98a',
    ready: true,
  },
  {
    id: 'security',
    icon: '🛡️',
    label: 'Security',
    description: 'Monitor logins and suspicious access',
    path: '/admin/security',
    color: '#f5a623',
    ready: false,
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Settings',
    description: 'Configure application system settings',
    path: '/admin/settings',
    color: '#a855f7',
    ready: false,
  },
  {
    id: 'backup',
    icon: '💾',
    label: 'Backup',
    description: 'Export and backup all application data',
    path: '/admin/backup',
    color: '#06b6d4',
    ready: false,
  },
  {
    id: 'audit',
    icon: '📋',
    label: 'Audit Log',
    description: 'Track all admin and user actions',
    path: '/admin/audit',
    color: '#e879a4',
    ready: false,
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { adminLogout } = useAdmin();

  const handleLogout = () => {
    adminLogout();
    navigate('/login');
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-badge">⚡ ADMIN</span>
          <h1 className="admin-title">SafeNotes Admin Panel</h1>
        </div>
        <button className="btn admin-logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </header>

      <main className="admin-main">
        <p className="admin-subtitle">Select a module to manage the SafeNotes application</p>

        <div className="admin-modules-grid">
          {ADMIN_MODULES.map((mod) => (
            <button
              key={mod.id}
              className={`admin-module-card${mod.ready ? '' : ' admin-module-disabled'}`}
              onClick={() => mod.ready && navigate(mod.path)}
              disabled={!mod.ready}
              style={{ '--mod-color': mod.color } as React.CSSProperties}
            >
              <span className="admin-mod-icon">{mod.icon}</span>
              <span className="admin-mod-label">{mod.label}</span>
              <span className="admin-mod-desc">{mod.description}</span>
              {!mod.ready && <span className="admin-coming-soon">Coming Soon</span>}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
