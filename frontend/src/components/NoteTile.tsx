import type { NoteSummary } from '../types';

interface NoteTileProps {
  note: NoteSummary;
  onClick: (id: string) => void;
  shared?: boolean;
}

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

export default function NoteTile({ note, onClick, shared }: NoteTileProps) {
  const colorClass = colorFromId(note.id);

  return (
    <button
      className={`note-tile ${colorClass}${shared ? ' note-tile--shared' : ''}`}
      onClick={() => onClick(note.id)}
      aria-label={`Open note: ${note.title}`}
    >
      <div className="note-tile-pin" />
      {shared && <span className="note-tile-shared-badge">🔗</span>}
      {!shared && note.isShared && <span className="note-tile-owner-shared-badge" title="Shared with others">👥</span>}
      <h3 className="note-tile-title">{note.title}</h3>
      <span className="note-tile-date">
        {new Date(note.updatedAt).toLocaleDateString()}
      </span>
    </button>
  );
}
