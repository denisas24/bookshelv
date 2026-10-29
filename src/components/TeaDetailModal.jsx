import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORY_EMOJI, renderStars, showToast } from '../lib/utils.js';
import { format } from 'date-fns';

export default function TeaDetailModal({ entry, open, onClose, onEdit, onDelete, canEdit }) {
  const { user } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!open || !entry) return null;

  const toggleFavorite = async () => {
    setToggling(true);
    await supabase.from('tea_entries').update({ favorite: !entry.favorite }).eq('id', entry.id);
    setToggling(false);
    showToast(entry.favorite ? 'Removed from favorites.' : 'Added to favorites.');
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await supabase.from('tea_entries').delete().eq('id', entry.id);
    setDeleting(false);
    showToast('Tea deleted.');
    if (onDelete) onDelete();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          {entry.category && <span className="cat-badge">{entry.category}</span>}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>{entry.name}</h2>
          {entry.brand && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>{entry.brand}</p>}
          <div className="stars" style={{ fontSize: 20 }}>{renderStars(entry.rating)}</div>
          {entry.date_tried && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {format(new Date(entry.date_tried), 'MMMM d, yyyy')}
            </p>
          )}
        </div>

        {entry.photo_url && (
          <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 200 }}>
            <img src={entry.photo_url} alt={entry.name} style={{ width: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {entry.review && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            {entry.review}
          </p>
        )}

        {entry.tags?.length > 0 && (
          <div className="tag-list" style={{ marginBottom: 20 }}>
            {entry.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}

        {canEdit && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { onClose(); onEdit(entry); }}>
              Edit
            </button>
            <button
              className="btn-ghost"
              style={{ flex: 1, color: entry.favorite ? 'var(--star)' : undefined }}
              onClick={toggleFavorite}
              disabled={toggling}
            >
              {entry.favorite ? '★ Favorited' : '☆ Favorite'}
            </button>
            <button
              className="btn-danger"
              style={{ flex: 1 }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {confirm ? 'Confirm delete' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
