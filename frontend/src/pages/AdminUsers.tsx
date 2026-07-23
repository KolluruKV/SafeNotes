import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import type { AdminUser } from '../types';

type ConfirmAction = { type: 'soft'; mobile: string } | { type: 'hard'; mobile: string };

function statusMeta(status: string) {
  if (status === 'active') return { label: 'Active', cls: 'status-active' };
  if (status === 'inactive') return { label: 'Inactive', cls: 'status-inactive' };
  if (status === 'deleted') return { label: 'Soft Deleted', cls: 'status-deleted' };
  return { label: status, cls: '' };
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline edit state
  const [editingMobile, setEditingMobile] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Confirmation state
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [hardConfirmText, setHardConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add user modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newMobile, setNewMobile] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addUserError, setAddUserError] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const startEdit = (user: AdminUser) => {
    setEditingMobile(user.mobile);
    setEditEmail(user.email);
  };

  const cancelEdit = () => { setEditingMobile(null); setEditEmail(''); };

  const saveEmail = async (mobile: string) => {
    setEditSaving(true);
    try {
      await adminApi.updateUser(mobile, { email: editEmail });
      setEditingMobile(null);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to update email');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await adminApi.updateUser(user.mobile, { status: newStatus });
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to update status');
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'soft') {
        await adminApi.softDelete(confirm.mobile);
      } else {
        await adminApi.hardDelete(confirm.mobile);
      }
      setConfirm(null);
      setHardConfirmText('');
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (mobile: string) => {
    try {
      await adminApi.restoreUser(mobile);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to restore user');
    }
  };

  const openAddUser = () => {
    setNewMobile(''); setNewPassword(''); setNewEmail('');
    setAddUserError(''); setShowAddUser(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserLoading(true);
    setAddUserError('');
    try {
      await adminApi.createUser(newMobile, newPassword, newEmail);
      setShowAddUser(false);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setAddUserError(msg || 'Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="btn btn-secondary admin-back-btn" onClick={() => navigate('/admin')}>
            ← Back
          </button>
          <h1 className="admin-title">User Management</h1>
        </div>
        <div className="admin-header-right">
          <button className="btn admin-add-user-btn" onClick={openAddUser}>
            ＋ Add User
          </button>
          <span className="admin-badge">👥 {users.length} Users</span>
        </div>
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
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">No users found.</div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="admin-table-wrap admin-table-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const meta = statusMeta(user.status);
                    const isDeleted = user.status === 'deleted';
                    return (
                      <tr key={user.mobile} className={isDeleted ? 'row-deleted' : ''}>
                        <td className="cell-mono">{user.mobile}</td>
                        <td className="cell-email">
                          {editingMobile === user.mobile ? (
                            <div className="inline-edit-wrap">
                              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="admin-input" autoFocus />
                              <button className="btn btn-sm btn-success-sm" onClick={() => saveEmail(user.mobile)} disabled={editSaving}>{editSaving ? '…' : '✓'}</button>
                              <button className="btn btn-sm btn-ghost-sm" onClick={cancelEdit}>✕</button>
                            </div>
                          ) : (
                            <span className="cell-email-text">{user.email || '—'}</span>
                          )}
                        </td>
                        <td><span className={`status-badge ${meta.cls}`}>{meta.label}</span></td>
                        <td className="cell-date">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                        <td className="cell-actions">
                          {!isDeleted && (
                            <>
                              <button className="admin-action-btn edit-btn" onClick={() => startEdit(user)}>✏️ Edit</button>
                              <button className={`admin-action-btn ${user.status === 'active' ? 'deactivate-btn' : 'activate-btn'}`} onClick={() => toggleStatus(user)}>
                                {user.status === 'active' ? '🔴 Deactivate' : '🟢 Activate'}
                              </button>
                              <button className="admin-action-btn soft-del-btn" onClick={() => setConfirm({ type: 'soft', mobile: user.mobile })}>🗃️ Soft Delete</button>
                            </>
                          )}
                          {isDeleted && (
                            <button className="admin-action-btn activate-btn" onClick={() => handleRestore(user.mobile)}>♻️ Restore</button>
                          )}
                          <button className="admin-action-btn hard-del-btn" onClick={() => { setConfirm({ type: 'hard', mobile: user.mobile }); setHardConfirmText(''); }}>🗑️ Hard Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="admin-user-cards">
              {users.map((user) => {
                const meta = statusMeta(user.status);
                const isDeleted = user.status === 'deleted';
                return (
                  <div key={user.mobile} className={`admin-user-card${isDeleted ? ' card-deleted' : ''}`}>
                    {/* Card header — mobile + status */}
                    <div className="auc-header">
                      <span className="auc-mobile">{user.mobile}</span>
                      <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
                    </div>

                    {/* Email row */}
                    <div className="auc-row">
                      <span className="auc-label">Email</span>
                      {editingMobile === user.mobile ? (
                        <div className="auc-edit-wrap">
                          <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="admin-input" autoFocus />
                          <div className="auc-edit-btns">
                            <button className="btn btn-sm btn-success-sm" onClick={() => saveEmail(user.mobile)} disabled={editSaving}>{editSaving ? '…' : '✓ Save'}</button>
                            <button className="btn btn-sm btn-ghost-sm" onClick={cancelEdit}>✕ Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <span className="auc-value">{user.email || '—'}</span>
                      )}
                    </div>

                    {/* Joined row */}
                    <div className="auc-row">
                      <span className="auc-label">Joined</span>
                      <span className="auc-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                    </div>

                    {/* Actions grid */}
                    <div className="auc-actions">
                      {!isDeleted && (
                        <>
                          <button className="admin-action-btn edit-btn auc-btn" onClick={() => startEdit(user)}>✏️ Edit Email</button>
                          <button className={`admin-action-btn auc-btn ${user.status === 'active' ? 'deactivate-btn' : 'activate-btn'}`} onClick={() => toggleStatus(user)}>
                            {user.status === 'active' ? '🔴 Deactivate' : '🟢 Activate'}
                          </button>
                          <button className="admin-action-btn soft-del-btn auc-btn" onClick={() => setConfirm({ type: 'soft', mobile: user.mobile })}>🗃️ Soft Delete</button>
                        </>
                      )}
                      {isDeleted && (
                        <button className="admin-action-btn activate-btn auc-btn" onClick={() => handleRestore(user.mobile)}>♻️ Restore User</button>
                      )}
                      <button className="admin-action-btn hard-del-btn auc-btn" onClick={() => { setConfirm({ type: 'hard', mobile: user.mobile }); setHardConfirmText(''); }}>🗑️ Hard Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ── Soft Delete Confirmation Modal ── */}
      {confirm?.type === 'soft' && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">🗃️ Soft Delete User?</h3>
            <p className="confirm-body">
              User <strong>{confirm.mobile}</strong> will be <strong>deactivated and hidden</strong>.
              All their notes and shared data will be <strong>preserved</strong> and can be restored later.
              The user will no longer be able to login.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={actionLoading}>
                {actionLoading ? 'Deleting…' : 'Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hard Delete Confirmation Modal ── */}
      {confirm?.type === 'hard' && (
        <div className="modal-overlay" onClick={() => { setConfirm(null); setHardConfirmText(''); }}>
          <div className="modal admin-confirm-modal admin-danger-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">⚠️ Permanently Delete User?</h3>
            <p className="confirm-body">
              This will <strong>permanently and irreversibly delete</strong> user{' '}
              <strong>{confirm.mobile}</strong> along with <strong>ALL their notes, shared notes,
              and shares</strong>. This action <strong>cannot be undone</strong>.
            </p>
            <p className="confirm-instruction">
              Type <code>DELETE</code> below to confirm:
            </p>
            <input
              type="text"
              value={hardConfirmText}
              onChange={(e) => setHardConfirmText(e.target.value)}
              placeholder="DELETE"
              className="admin-input admin-confirm-input"
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setConfirm(null); setHardConfirmText(''); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirm}
                disabled={actionLoading || hardConfirmText !== 'DELETE'}
              >
                {actionLoading ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add User Modal ── */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal add-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-user-modal-header">
              <span className="add-user-icon">👤</span>
              <div>
                <h2>Add New User</h2>
                <p>Create a user account directly</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="add-user-form">
              <div className="form-group">
                <label htmlFor="au-mobile">Mobile Number</label>
                <input
                  id="au-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                  autoFocus
                  className="admin-input au-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="au-password">4-Digit Password</label>
                <input
                  id="au-password"
                  type="password"
                  inputMode="numeric"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  required
                  className="admin-input au-input"
                />
                <span className="au-hint">User can change this after login</span>
              </div>

              <div className="form-group">
                <label htmlFor="au-email">Email Address</label>
                <input
                  id="au-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="admin-input au-input"
                />
                <span className="au-hint">Used for OTP verification during login</span>
              </div>

              {addUserError && (
                <p className="error-text" style={{ marginTop: '0.25rem' }}>{addUserError}</p>
              )}

              <div className="modal-actions au-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddUser(false)}
                  disabled={addUserLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addUserLoading || newMobile.length !== 10 || newPassword.length !== 4 || !newEmail}
                >
                  {addUserLoading ? 'Creating…' : '＋ Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
