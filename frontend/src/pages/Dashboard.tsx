import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { NoteSummary, Note, SharedNoteSummary, SharedNote } from '../types';
import NoteTile from '../components/NoteTile';
import CreateNoteModal from '../components/CreateNoteModal';
import NoteViewModal from '../components/NoteViewModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ShareNoteModal from '../components/ShareNoteModal';
import SettingsModal from '../components/SettingsModal';
import favicon from '../images/safenotes_favicon.png';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedSharedNote, setSelectedSharedNote] = useState<SharedNote | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);
  const [shareNoteTitle, setShareNoteTitle] = useState('');
  const [filter, setFilter] = useState<'notes' | 'shared'>('notes');
  const [search, setSearch] = useState('');
  type ViewMode = 'list' | 'small' | 'medium' | 'tiles' | 'thumb';
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('defaultViewMode') as ViewMode) || 'medium'
  );
  const [showPreview, setShowPreview] = useState<boolean>(
    () => localStorage.getItem('showPreview') !== 'false'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showViewAccordion, setShowViewAccordion] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const [notesResult, sharedResult] = await Promise.allSettled([
        notesApi.getAll(),
        notesApi.getShared(),
      ]);

      if (notesResult.status === 'fulfilled') {
        setNotes(notesResult.value.data);
      } else {
        const msg = (notesResult.reason as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || 'Failed to load notes');
      }

      if (sharedResult.status === 'fulfilled') {
        setSharedNotes(sharedResult.value.data);
      }
      // shared notes failing silently is acceptable — own notes still show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleOpenNote = async (id: string) => {
    try {
      const res = await notesApi.getById(id);
      setSelectedNote(res.data);
    } catch {
      setError('Failed to load note');
    }
  };

  const handleOpenSharedNote = async (id: string) => {
    try {
      const res = await notesApi.getSharedById(id);
      setSelectedSharedNote(res.data);
    } catch {
      setError('Failed to load shared note');
    }
  };

  const handleCreate = async (title: string, description: string) => {
    const res = await notesApi.create(title, description);
    setNotes((prev) => [res.data, ...prev]);
    setShowCreate(false);
  };

  const handleEdit = async (title: string, description: string) => {
    if (!selectedNote) return;
    const res = await notesApi.update(selectedNote.id, title, description);
    setSelectedNote(res.data);
    setNotes((prev) => prev.map((n) => (n.id === res.data.id ? { ...n, title: res.data.title, updatedAt: res.data.updatedAt } : n)));
  };

  const handleEditShared = async (title: string, description: string) => {
    if (!selectedSharedNote) return;
    const res = await notesApi.editShared(selectedSharedNote.id, title, description);
    setSelectedSharedNote({ ...res.data, permissions: selectedSharedNote.permissions });
    setSharedNotes((prev) => prev.map((n) => n.id === res.data.id ? { ...n, title: res.data.title, updatedAt: res.data.updatedAt } : n));
  };

  const handleDeleteShared = async () => {
    if (!selectedSharedNote) return;
    await notesApi.deleteShared(selectedSharedNote.id);
    setSharedNotes((prev) => prev.filter((n) => n.id !== selectedSharedNote.id));
    setSelectedSharedNote(null);
  };

  const handleDeleteRequest = () => {
    setShowDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedNote) return;
    await notesApi.delete(selectedNote.id);
    setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
    setSelectedNote(null);
    setShowDelete(false);
  };

  const handleOpenShare = (id: string, title: string) => {
    setShareNoteId(id);
    setShareNoteTitle(title);
  };

  const handleCloseShare = (savedNoteId?: string, hasShares?: boolean) => {
    if (savedNoteId !== undefined) {
      // Update the isShared badge on the tile immediately
      setNotes((prev) =>
        prev.map((n) => (n.id === savedNoteId ? { ...n, isShared: hasShares } : n))
      );
    }
    setShareNoteId(null);
    setShareNoteTitle('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-top-row">
          <div className="header-left">
            <span className="header-logo">
              <img src={favicon} alt="SafeNotes" />
            </span>
            <h1><span className="logo-safe">Safe</span><span className="logo-notes">Notes</span></h1>
          </div>
          <div className="header-right">
            <label className="shared-toggle">
              <span className="shared-toggle-label">Shared</span>
              <span
                className={`toggle-switch${filter === 'shared' ? ' on' : ''}`}
                onClick={() => setFilter(filter === 'shared' ? 'notes' : 'shared')}
                role="switch"
                aria-checked={filter === 'shared'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setFilter(filter === 'shared' ? 'notes' : 'shared')}
              >
                <span className="toggle-knob" />
              </span>
            </label>
            <button className="btn btn-new-note" onClick={() => setShowCreate(true)} title="New Note">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className="btn btn-hamburger" onClick={() => setShowMenu(true)} title="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="header-search-row">
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} title="Clear">✕</button>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {loading && <p className="loading-text">Loading your notes...</p>}
        {error && <p className="error-text center">{error}</p>}

        {!loading && notes.length === 0 && sharedNotes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>No notes yet</h2>
            <p>Create your first secure note to store keys, passkeys, and important data.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create Your First Note
            </button>
          </div>
        )}

        <div className="view-switcher">
          <button
            className={`view-accordion-toggle${showViewAccordion ? ' open' : ''}`}
            onClick={() => setShowViewAccordion((v) => !v)}
            title="Change view"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <rect x="2" y="2" width="7" height="7" rx="1"/>
              <rect x="11" y="2" width="7" height="7" rx="1"/>
              <rect x="2" y="11" width="7" height="7" rx="1"/>
              <rect x="11" y="11" width="7" height="7" rx="1"/>
            </svg>
            <span>View</span>
            <svg className="view-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showViewAccordion && (
            <div className="view-switcher-modes">
            {(['list', 'small', 'medium', 'tiles', 'thumb'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={`view-btn${viewMode === mode ? ' active' : ''}`}
                onClick={() => { setViewMode(mode); setShowViewAccordion(false); }}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
              {mode === 'list' && (
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <rect x="2" y="3" width="16" height="2.5" rx="1"/>
                  <rect x="2" y="8.75" width="16" height="2.5" rx="1"/>
                  <rect x="2" y="14.5" width="16" height="2.5" rx="1"/>
                </svg>
              )}
              {mode === 'small' && (
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <rect x="2" y="2" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="2" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="2" width="3.5" height="3.5" rx="0.5"/><rect x="16.5" y="2" width="1.5" height="3.5" rx="0.5"/>
                  <rect x="2" y="7" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="7" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="7" width="3.5" height="3.5" rx="0.5"/><rect x="16.5" y="7" width="1.5" height="3.5" rx="0.5"/>
                  <rect x="2" y="12" width="3.5" height="3.5" rx="0.5"/><rect x="7" y="12" width="3.5" height="3.5" rx="0.5"/><rect x="12" y="12" width="3.5" height="3.5" rx="0.5"/><rect x="16.5" y="12" width="1.5" height="3.5" rx="0.5"/>
                  <rect x="2" y="16.5" width="3.5" height="1.5" rx="0.5"/><rect x="7" y="16.5" width="3.5" height="1.5" rx="0.5"/>
                </svg>
              )}
              {mode === 'medium' && (
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9.5" y="2" width="5" height="5" rx="1"/><rect x="17" y="2" width="1" height="5" rx="0.5"/>
                  <rect x="2" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="17" y="9.5" width="1" height="5" rx="0.5"/>
                  <rect x="2" y="17" width="5" height="1" rx="0.5"/><rect x="9.5" y="17" width="5" height="1" rx="0.5"/>
                </svg>
              )}
              {mode === 'tiles' && (
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <rect x="2" y="2" width="7" height="7" rx="1"/>
                  <rect x="11" y="2" width="7" height="7" rx="1"/>
                  <rect x="2" y="11" width="7" height="7" rx="1"/>
                  <rect x="11" y="11" width="7" height="7" rx="1"/>
                </svg>
              )}
              {mode === 'thumb' && (
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <rect x="1" y="1" width="18" height="9" rx="1.5"/>
                  <rect x="1" y="12" width="18" height="7" rx="1.5"/>
                </svg>
              )}
            </button>
          ))}
            </div>
          )}
        </div>

        <div className={`notes-board notes-board--${viewMode}`}>
          {filter === 'notes' && notes
            .filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
            .map((note) => (
            <NoteTile key={note.id} note={note} onClick={handleOpenNote} viewMode={viewMode} showPreview={showPreview} />
          ))}
          {filter === 'shared' && notes.filter((n) => n.isShared && n.title.toLowerCase().includes(search.toLowerCase())).map((note) => (
            <NoteTile key={note.id} note={note} onClick={handleOpenNote} viewMode={viewMode} showPreview={showPreview} />
          ))}
          {filter === 'shared' && sharedNotes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase())).map((note) => (
            <NoteTile key={`sh-${note.id}`} note={note} onClick={handleOpenSharedNote} shared viewMode={viewMode} showPreview={showPreview} />
          ))}
          {filter === 'shared' && !notes.some((n) => n.isShared) && sharedNotes.length === 0 && (
            <p className="empty-filter-text">No shared notes yet.</p>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateNoteModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {selectedNote && !showDelete && (
        <NoteViewModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onShare={() => handleOpenShare(selectedNote.id, selectedNote.title)}
        />
      )}

      {selectedSharedNote && (
        <NoteViewModal
          note={selectedSharedNote}
          onClose={() => setSelectedSharedNote(null)}
          onEdit={handleEditShared}
          onDelete={handleDeleteShared}
          canEdit={selectedSharedNote.permissions.includes('edit')}
          canDelete={selectedSharedNote.permissions.includes('delete')}
          ownerMobile={selectedSharedNote.ownerMobile}
        />
      )}

      {showDelete && selectedNote && (
        <DeleteConfirmModal
          onClose={() => setShowDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {shareNoteId && (
        <ShareNoteModal
          noteId={shareNoteId}
          noteTitle={shareNoteTitle}
          onClose={handleCloseShare}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          showPreview={showPreview}
          onShowPreviewChange={setShowPreview}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {/* ── Side Menu ── */}
      {showMenu && (
        <div className="side-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="side-menu" onClick={(e) => e.stopPropagation()}>
            <div className="side-menu-header">
              <span className="side-menu-title">
                <span className="logo-safe">Safe</span><span className="logo-notes">Notes</span>
              </span>
              <button className="side-menu-close" onClick={() => setShowMenu(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <nav className="side-menu-nav">
              <button className="side-menu-item" onClick={() => { setShowMenu(false); setShowSettings(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
              </button>
              <button className="side-menu-item side-menu-item--danger" onClick={() => { setShowMenu(false); handleLogout(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
