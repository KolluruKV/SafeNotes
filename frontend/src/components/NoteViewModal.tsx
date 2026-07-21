import { useState } from 'react';
import type { Note } from '../types';

const COLOR_CLASSES = [
  'note-blue', 'note-gold', 'note-violet', 'note-emerald',
  'note-orange', 'note-rose', 'note-cyan', 'note-yellow',
];

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return COLOR_CLASSES[Math.abs(hash) % COLOR_CLASSES.length];
}

interface NoteViewModalProps {
  note: Note;
  onClose: () => void;
  onEdit: (title: string, description: string) => Promise<void>;
  onDelete: () => void;
  onShare?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  ownerMobile?: string;
}

export default function NoteViewModal({
  note, onClose, onEdit, onDelete, onShare,
  canEdit = true, canDelete = true, ownerMobile,
}: NoteViewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onEdit(title, description);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (ownerMobile) {
      // Shared note: show inline confirmation (no OTP needed)
      setConfirmDelete(true);
    } else {
      // Own note: delegate to parent OTP flow
      onDelete();
    }
  };

  const colorClass = colorFromId(note.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal view-modal ${colorClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          {isEditing ? (
            <input
              className="edit-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          ) : (
            <h2 className="view-title">{note.title}</h2>
          )}
          <div className="view-actions">
            {!isEditing && (
              <>
                {onShare && (
                  <button className="btn-icon" onClick={onShare} aria-label="Share">
                    🔗
                  </button>
                )}
                {canEdit && (
                  <button className="btn-icon" onClick={() => setIsEditing(true)} aria-label="Edit">
                    ✏️
                  </button>
                )}
                {canDelete && (
                  <button className="btn-icon" onClick={handleDeleteClick} aria-label="Delete">
                    🗑️
                  </button>
                )}
              </>
            )}
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {ownerMobile && (
          <p className="shared-by-label">🔗 Shared by {ownerMobile}</p>
        )}

        {confirmDelete ? (
          <div className="delete-inline-confirm">
            <p className="delete-inline-text">Delete this note permanently? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={onDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="view-body">
              {isEditing ? (
                <textarea
                  className="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                />
              ) : (
                <pre className="view-description">{note.description || 'No description'}</pre>
              )}
            </div>

            <div className="view-footer">
              <span className="view-date">
                Updated {new Date(note.updatedAt).toLocaleString()}
              </span>
              {isEditing && (
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}