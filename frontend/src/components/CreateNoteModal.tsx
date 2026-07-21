interface CreateNoteModalProps {
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}

export default function CreateNoteModal({ onClose, onSave }: CreateNoteModalProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    await onSave(title, description);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Note</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Enter note title..."
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Enter your secure data, keys, passkeys..."
              rows={6}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
