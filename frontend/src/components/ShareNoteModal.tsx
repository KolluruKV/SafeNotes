import { useState, useEffect } from 'react';
import { notesApi, usersApi } from '../services/api';
import type { UserItem, ShareEntry } from '../types';

interface ShareNoteModalProps {
  noteId: string;
  noteTitle: string;
  onClose: (savedNoteId?: string, hasShares?: boolean) => void;
}

const PERMISSIONS = ['view', 'edit', 'delete'] as const;
type Perm = typeof PERMISSIONS[number];

export default function ShareNoteModal({ noteId, noteTitle, onClose }: ShareNoteModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  // map of mobile -> Set<permission>
  const [shares, setShares] = useState<Map<string, Set<Perm>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, sharesRes] = await Promise.all([
          usersApi.getAll(),
          notesApi.getShares(noteId),
        ]);
        setUsers(usersRes.data);
        const map = new Map<string, Set<Perm>>();
        for (const entry of sharesRes.data) {
          map.set(entry.mobile, new Set(entry.permissions as Perm[]));
        }
        setShares(map);
      } catch {
        setError('Failed to load sharing info');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [noteId]);

  const isShared = (mobile: string) => shares.has(mobile);

  const toggleShare = (mobile: string) => {
    setShares((prev) => {
      const next = new Map(prev);
      if (next.has(mobile)) {
        next.delete(mobile);
      } else {
        next.set(mobile, new Set(['view']));
      }
      return next;
    });
  };

  const togglePerm = (mobile: string, perm: Perm) => {
    if (perm === 'view') return; // view is always on
    setShares((prev) => {
      const next = new Map(prev);
      const perms = new Set<Perm>(next.get(mobile) ?? (['view'] as Perm[]));
      if (perms.has(perm)) {
        perms.delete(perm);
      } else {
        perms.add(perm);
      }
      next.set(mobile, perms);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: ShareEntry[] = Array.from(shares.entries()).map(([mobile, perms]) => ({
        mobile,
        permissions: Array.from(perms),
      }));
      await notesApi.updateShares(noteId, payload);
      setSuccess('Sharing updated!');
      setTimeout(() => onClose(noteId, payload.length > 0), 700);
    } catch {
      setError('Failed to update sharing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose()}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Note</h2>
          <button className="btn-icon" onClick={() => onClose()} aria-label="Close">✕</button>
        </div>

        <p className="share-note-name">"{noteTitle}"</p>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {loading ? (
          <p className="loading-text">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="share-empty">No other users available to share with.</p>
        ) : (
          <div className="share-user-list">
            <p className="share-hint">Check a user to share, then set their permissions:</p>
            {users.map((user) => {
              const shared = isShared(user.mobile);
              const perms = shares.get(user.mobile) ?? new Set<Perm>();
              return (
                <div key={user.mobile} className={`share-user-row ${shared ? 'share-user-row--checked' : ''}`}>
                  <div className="share-user-main">
                    <label className="share-user-toggle">
                      <input
                        type="checkbox"
                        className="share-checkbox"
                        checked={shared}
                        onChange={() => toggleShare(user.mobile)}
                      />
                      <div className="share-user-info">
                        <span className="share-user-mobile">{user.mobile}</span>
                        {user.email && <span className="share-user-email">{user.email}</span>}
                      </div>
                    </label>
                    {shared && <span className="share-badge">Shared</span>}
                  </div>

                  {shared && (
                    <div className="share-perms-row">
                      {PERMISSIONS.map((perm) => (
                        <label key={perm} className={`share-perm-label ${perm === 'view' ? 'share-perm-label--disabled' : ''}`}>
                          <input
                            type="checkbox"
                            className="share-perm-checkbox"
                            checked={perm === 'view' ? true : perms.has(perm)}
                            disabled={perm === 'view'}
                            onChange={() => togglePerm(user.mobile, perm)}
                          />
                          <span className={`share-perm-name share-perm--${perm}`}>
                            {perm.charAt(0).toUpperCase() + perm.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => onClose()} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Sharing'}
          </button>
        </div>
      </div>
    </div>
  );
}