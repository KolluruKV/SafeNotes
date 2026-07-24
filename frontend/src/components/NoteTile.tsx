import type { NoteSummary } from '../types';

type ViewMode = 'list' | 'small' | 'medium' | 'tiles' | 'thumb';

interface NoteTileProps {
  note: NoteSummary;
  onClick: (id: string) => void;
  shared?: boolean;
  viewMode?: ViewMode;
  showPreview?: boolean;
}

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

export default function NoteTile({ note, onClick, shared, viewMode = 'medium', showPreview = true }: NoteTileProps) {
  const tileStyle = hexToTileStyle(note.color ?? '#3b9eff');
  const showPreviewText = showPreview && (viewMode === 'tiles' || viewMode === 'thumb' || viewMode === 'list') && !!note.preview;

  return (
    <button
      className={`note-tile${shared ? ' note-tile--shared' : ''}`}
      style={tileStyle}
      onClick={() => onClick(note.id)}
      aria-label={`Open note: ${note.title}`}
    >
      <div className="note-tile-pin" />
      {shared && <span className="note-tile-shared-badge">🔗</span>}
      {!shared && note.isShared && <span className="note-tile-owner-shared-badge" title="Shared with others">👥</span>}
      <h3 className="note-tile-title">{note.title}</h3>
      {showPreviewText && <p className="note-tile-preview">{note.preview}</p>}
    </button>
  );
}

