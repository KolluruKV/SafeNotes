import { useState } from 'react';
import type { Note } from '../types';

/** Build inline gradient + shadow styles from a hex color stored in DB. */
function hexToTileStyle(hex: string): React.CSSProperties {
  const clean = hex?.startsWith('#') ? hex : '#3b9eff';
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  const shade = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  return {
    // shade(0.60) ensures even vivid/bright hues are dark enough for white text
    background: `linear-gradient(145deg, ${shade(0.60)} 0%, ${shade(0.34)} 55%, ${shade(0.16)} 100%)`,
    borderColor: `rgba(${r},${g},${b},0.5)`,
    borderTopColor: clean,
    boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 28px rgba(${r},${g},${b},0.22)`,
  };
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

  const modalStyle = hexToTileStyle(note.color ?? '#3b9eff');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal view-modal"
        style={modalStyle}
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