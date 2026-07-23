import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import type { AdminStats } from '../types';

const STAT_CARDS = (s: AdminStats) => [
  { icon: '👥', label: 'Total Users',    value: s.totalUsers,    color: '#3b9eff' },
  { icon: '✅', label: 'Active Users',   value: s.activeUsers,   color: '#10d98a' },
  { icon: '🔴', label: 'Inactive Users', value: s.inactiveUsers, color: '#f5a623' },
  { icon: '🗃️', label: 'Soft Deleted',   value: s.deletedUsers,  color: '#e879a4' },
  { icon: '📝', label: 'Total Notes',    value: s.totalNotes,    color: '#a855f7' },
  { icon: '🔗', label: 'Total Shares',   value: s.totalShares,   color: '#06b6d4' },
];

export default function AdminReports() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getStats()
      .then((res) => setStats(res.data))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || 'Failed to load statistics');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="btn btn-secondary admin-back-btn" onClick={() => navigate('/admin')}>
            ← Back
          </button>
          <h1 className="admin-title">Reports &amp; Statistics</h1>
        </div>
        <span className="admin-badge">📊 Live Data</span>
      </header>

      <main className="admin-main">
        {error && (
          <div className="admin-alert admin-alert-error">
            {error}
            <button onClick={() => setError('')} className="admin-alert-close">✕</button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <span className="admin-spinner" />
            Loading statistics…
          </div>
        ) : stats ? (
          <>
            <div className="admin-stats-grid">
              {STAT_CARDS(stats).map((card) => (
                <div
                  key={card.label}
                  className="admin-stat-card"
                  style={{ '--stat-color': card.color } as React.CSSProperties}
                >
                  <span className="stat-icon">{card.icon}</span>
                  <span className="stat-value">{card.value}</span>
                  <span className="stat-label">{card.label}</span>
                </div>
              ))}
            </div>

            <div className="admin-report-section">
              <h2 className="admin-section-title">User Health</h2>
              <div className="admin-health-bar-wrap">
                {stats.totalUsers > 0 && (
                  <div className="admin-health-bar">
                    <div
                      className="health-bar-seg health-active"
                      style={{ width: `${(stats.activeUsers / stats.totalUsers) * 100}%` }}
                      title={`Active: ${stats.activeUsers}`}
                    />
                    <div
                      className="health-bar-seg health-inactive"
                      style={{ width: `${(stats.inactiveUsers / stats.totalUsers) * 100}%` }}
                      title={`Inactive: ${stats.inactiveUsers}`}
                    />
                    <div
                      className="health-bar-seg health-deleted"
                      style={{ width: `${(stats.deletedUsers / stats.totalUsers) * 100}%` }}
                      title={`Soft Deleted: ${stats.deletedUsers}`}
                    />
                  </div>
                )}
                <div className="health-legend">
                  <span className="legend-dot health-active" /> Active
                  <span className="legend-dot health-inactive" /> Inactive
                  <span className="legend-dot health-deleted" /> Deleted
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
