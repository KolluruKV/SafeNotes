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
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);
  const [shareNoteTitle, setShareNoteTitle] = useState('');

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
    setDeleteOtpSent(false);
  };

  const handleRequestDeleteOtp = async () => {
    if (!selectedNote) return;
    await notesApi.requestDeleteOtp(selectedNote.id);
    setDeleteOtpSent(true);
  };

  const handleConfirmDelete = async (otp: string) => {
    if (!selectedNote) return;
    await notesApi.delete(selectedNote.id, otp);
    setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
    setSelectedNote(null);
    setShowDelete(false);
    setDeleteOtpSent(false);
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
        <div className="header-left">
          <span className="header-logo">
            <img src={favicon} alt="SafeNotes" />
          </span>
          <h1>SafeNotes</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Note
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
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

        <div className="notes-board">
          {notes.map((note) => (
            <NoteTile key={note.id} note={note} onClick={handleOpenNote} />
          ))}
          {sharedNotes.map((note) => (
            <NoteTile key={`sh-${note.id}`} note={note} onClick={handleOpenSharedNote} shared />
          ))}
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
          onClose={() => { setShowDelete(false); setDeleteOtpSent(false); }}
          onConfirm={handleConfirmDelete}
          onRequestOtp={handleRequestDeleteOtp}
          otpSent={deleteOtpSent}
        />
      )}

      {shareNoteId && (
        <ShareNoteModal
          noteId={shareNoteId}
          noteTitle={shareNoteTitle}
          onClose={handleCloseShare}
        />
      )}
    </div>
  );
}
