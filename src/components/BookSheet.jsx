import { useEffect, useRef, useState } from 'react';
import StarInput from './StarInput.jsx';
import { GENRES, STATUSES, addBook, updateEntry, removeEntry, logRead, localDate, genreLabel, suggestBooks } from '../lib/books.js';
import BookCover from './BookCover.jsx';
import { showToast } from '../lib/utils.js';

// Hinzufügen (entry = null) oder Bearbeiten eines Bibliothekseintrags.
export default function BookSheet({ open, entry, initialStatus = 'want', onClose, onSaved, onRemoved }) {
  const editing = !!entry;
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('want');
  const [favorite, setFavorite] = useState(false);
  const [logIt, setLogIt] = useState(false);
  const [rating, setRating] = useState(0);
  const [finishedOn, setFinishedOn] = useState(localDate());
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [changeGenre, setChangeGenre] = useState(false);
  const [sugg, setSugg] = useState([]);
  const [picked, setPicked] = useState(false);
  const timer = useRef(null);

  // Beim Tippen des Titels Open Library fragen (kurz verzögert).
  useEffect(() => {
    if (entry || picked) return undefined;
    clearTimeout(timer.current);
    const ctrl = new AbortController();
    timer.current = setTimeout(async () => setSugg(await suggestBooks(title, ctrl.signal)), 350);
    return () => { clearTimeout(timer.current); ctrl.abort(); };
  }, [title, entry, picked]);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.work?.title || ''); setAuthor(entry?.work?.author || '');
    setGenre(entry?.genre || entry?.work?.genre || '');
    setStatus(entry?.status || initialStatus); setFavorite(!!entry?.favorite);
    setLogIt(false); setRating(0); setFinishedOn(localDate()); setReview('');
    setError(''); setBusy(false); setConfirmRemove(false); setChangeGenre(false); setSugg([]); setPicked(false);
  }, [open, entry, initialStatus]);

  if (!open) return null;

  // Beim Hinzufügen mit Status Read wird direkt ein Durchgang erfasst.
  const showLog = editing ? logIt : status === 'read';

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    let res;
    if (!editing) {
      res = await addBook({ title, author, status, rating, finishedOn, review });
    } else {
      const fields = { status: logIt ? 'read' : status, favorite };
      if (changeGenre) fields.genre = genre || null;
      res = await updateEntry(entry.id, fields);
      if (!res.error && logIt) {
        res = await logRead({ workId: entry.work.id, rating, finishedOn, review, isReread: !!entry.log });
      }
    }
    setBusy(false);
    if (res.error) { setError(res.error.message || 'Could not save.'); return; }
    showToast(editing ? 'Saved' : 'Added to your library');
    onSaved(); onClose();
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await removeEntry(entry.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    showToast('Removed from your library');
    onSaved(); onClose(); onRemoved?.();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal book-sheet" onSubmit={save}>
        <div className="modal-header">
          <h2>{editing ? entry.work.title : 'Add book'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {!editing && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="bs-title">Title</label>
              <input id="bs-title" value={title} onChange={(e) => { setTitle(e.target.value); setPicked(false); }} required maxLength={300} autoComplete="off" />
              {sugg.length > 0 && !picked && (
                <ul className="sugg" role="listbox" aria-label="Suggestions">
                  {sugg.map((b) => (
                    <li key={b.title + b.author}>
                      <button type="button" className="sugg-item" onClick={() => { setTitle(b.title); setAuthor(b.author); setPicked(true); setSugg([]); }}>
                        <BookCover url={b.cover_url} title={b.title} />
                        <span className="book-text">
                          <span className="book-title">{b.title}</span>
                          <span className="book-author">{b.author}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bs-author">Author</label>
              <input id="bs-author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} />
            </div>
          </>
        )}
        {editing && <p className="sheet-meta">{entry.work.author}</p>}

        <div className="form-group">
          <span className="form-label">Status</span>
          <div className="seg">
            {STATUSES.map(([k, label]) => (
              <button type="button" key={k} className={`seg-btn${status === k ? ' on' : ''}`} onClick={() => setStatus(k)}>{label}</button>
            ))}
          </div>
        </div>

        {editing && (
          <div className="form-group">
            <span className="form-label">Genre</span>
            {changeGenre ? (
              <select id="bs-genre" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
                <option value="">Not set</option>
                {GENRES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            ) : (
              <p className="genre-line">
                {genreLabel(genre) || 'Not detected yet'}
                <button type="button" className="link-btn muted" onClick={() => setChangeGenre(true)}>Change</button>
              </p>
            )}
          </div>
        )}
        {!editing && <p className="hint">Genre, pages and cover are filled in automatically where Open Library knows the book.</p>}

        {editing && (
          <label className="check-row">
            <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} /> Favorite
          </label>
        )}

        {editing && !logIt && (
          <button type="button" className="btn-ghost wide" onClick={() => setLogIt(true)}>
            {entry.log ? 'Log a reread' : 'Finished it? Log it'}
          </button>
        )}

        {showLog && (
          <div className="log-box">
            <div className="form-group">
              <span className="form-label">Rating</span>
              <StarInput value={rating} onChange={setRating} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bs-date">Finished on</label>
              <input id="bs-date" type="date" value={finishedOn} max={localDate()} onChange={(e) => setFinishedOn(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bs-review">Review</label>
              <textarea id="bs-review" rows={4} value={review} onChange={(e) => setReview(e.target.value)} maxLength={10000} />
            </div>
            <p className="hint">Only for books you have read in full. Anything else belongs in your notes.</p>
          </div>
        )}

        <div className="sheet-actions">
          {editing && (confirmRemove
            ? <button type="button" className="btn-danger" onClick={remove} disabled={busy}>Remove for good</button>
            : <button type="button" className="link-btn muted" onClick={() => setConfirmRemove(true)}>Remove from library</button>)}
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}
