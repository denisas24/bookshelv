import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../lib/auth.jsx';
import { loadBook, enrichWork, genreLabel, renderStars, addQuote, deleteQuote, addNote, deleteNote, updateLog, deleteLog, localDate, STATUSES } from '../lib/books.js';
import StarInput from '../components/StarInput.jsx';
import BookCover from '../components/BookCover.jsx';
import ReadingLog from '../components/ReadingLog.jsx';
import Avatar from '../components/Avatar.jsx';

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

export default function BookPage({ reloadKey, onEdit }) {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reviews');

  const load = async () => {
    const res = await loadBook(id, user.id);
    if (res.error) { setError(res.error.message); return; }
    setData(res);
    // Fehlendes Cover, Genre oder Seitenzahl nachtragen.
    const patch = await enrichWork(res.entry.work);
    if (patch) setData((d) => ({ ...d, entry: { ...d.entry, work: { ...d.entry.work, ...patch } } }));
  };
  useEffect(() => { load(); }, [id, reloadKey]);

  if (error) return <div className="library"><div className="auth-error">{error}</div></div>;
  if (!data) return <div className="library"><div className="book-row skeleton-row" /></div>;

  const { entry, days, logs, quotes, notes, others, avg, ratingCount } = data;
  const w = entry.work;
  const genre = entry.genre || w.genre;
  const statusLabel = (STATUSES.find(([k]) => k === entry.status) || [])[1];
  const showLog = entry.status === 'reading' || Object.keys(days).length > 0;

  return (
    <div className="library book-page">
      <div className="bp-top">
        <button type="button" className="link-btn muted" onClick={() => navigate(-1)}>← Back</button>
        <button type="button" className="btn-small" onClick={() => onEdit({ ...entry, log: logs[0] || null })}>Edit</button>
      </div>

      <header className="bp-head">
        <BookCover url={w.cover_url} title={w.title} size="lg" reading={entry.status === 'reading'} />
        <div className="bp-meta">
          <h1 className="bp-title">{w.title}</h1>
          <p className="bp-author">{w.author}</p>
          <p className="bp-facts">
            {[genreLabel(genre), w.pages ? `${w.pages} pages` : null, statusLabel].filter(Boolean).join(' · ')}
          </p>
          {avg != null && (
            <p className="bp-avg"><span className="stars">{renderStars(avg)}</span> <span>{avg.toFixed(1)} · {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</span></p>
          )}
        </div>
      </header>

      {showLog && (
        <ReadingLog entryId={entry.id} days={days} onChange={(next) => setData((d) => ({ ...d, days: next }))} />
      )}

      <nav className="bp-tabs" aria-label="Book sections">
        {[['reviews', 'Reviews'], ['quotes', 'Quotes'], ['notes', 'Notes']].map(([k, label]) => (
          <button key={k} type="button" className={`lib-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>
            {label}{k === 'notes' && <> <LockIcon /></>}
          </button>
        ))}
      </nav>

      {tab === 'reviews' && (
        <div className="bp-panel">
          {logs.length === 0 && others.length === 0 && (
            <div className="lib-empty">
              <p>{entry.status === 'reading'
                ? 'Reviews come once you have finished the book. Until then, your thoughts belong in Notes.'
                : 'No reviews yet.'}</p>
              {entry.status !== 'want' && (
                <button type="button" className="btn-ghost" onClick={() => onEdit({ ...entry, log: logs[0] || null })}>Finished it? Log it</button>
              )}
            </div>
          )}
          {logs.map((l) => (
            <OwnReview key={l.id} log={l} profile={profile} reload={load} />
          ))}
          {others.map((o) => (
            <article key={o.id} className="review">
              <div className="review-head">
                <Avatar profile={o.profile} size={28} />
                <span className="review-who">{o.profile?.display_name || 'Reader'}</span>
                <span className="stars">{renderStars(o.rating)}</span>
                {o.is_reread && <span className="review-tag">Reread</span>}
              </div>
              <p className="review-date">{format(new Date(o.posted_at), 'd MMM yyyy')}</p>
              {o.review && <p className="review-text">{o.review}</p>}
            </article>
          ))}
        </div>
      )}

      {tab === 'quotes' && (
        <QuotesPanel workId={w.id} quotes={quotes} reload={load} />
      )}

      {tab === 'notes' && (
        <NotesPanel workId={w.id} notes={notes} reload={load} />
      )}
    </div>
  );
}

function QuotesPanel({ workId, quotes, reload }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(''); const [page, setPage] = useState(''); const [thought, setThought] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await addQuote({ workId, page: Number(page) || null, body, thought });
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    setBody(''); setPage(''); setThought(''); setOpen(false); reload();
  };
  return (
    <div className="bp-panel">
      {open ? (
        <form className="mini-form" onSubmit={save}>
          {err && <div className="auth-error">{err}</div>}
          <textarea rows={3} placeholder="The passage, word for word" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} required aria-label="Quote" />
          <div className="mini-row">
            <input inputMode="numeric" placeholder="Page" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} aria-label="Page" />
            <input placeholder="Your thought (optional)" value={thought} onChange={(e) => setThought(e.target.value)} maxLength={5000} aria-label="Your thought" />
          </div>
          <div className="mini-actions">
            <button type="button" className="link-btn muted" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>Save quote</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost wide" onClick={() => setOpen(true)}>Add a quote</button>
      )}
      {quotes.length === 0 && !open && <p className="muted-text">Only you can see your quotes for now.</p>}
      <ul className="quote-list">
        {quotes.map((q) => (
          <li key={q.id} className="quote-item">
            <blockquote>{q.body}</blockquote>
            {q.thought && <p className="quote-thought">{q.thought}</p>}
            <p className="quote-src">
              {q.page ? `p. ${q.page}` : 'No page'}
              <button type="button" className="link-btn muted" onClick={async () => { await deleteQuote(q.id); reload(); }}>Delete</button>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotesPanel({ workId, notes, reload }) {
  const [body, setBody] = useState(''); const [page, setPage] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await addNote({ workId, page: Number(page) || null, body });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setBody(''); setPage(''); reload();
  };
  return (
    <div className="bp-panel">
      <form className="mini-form" onSubmit={save}>
        {err && <div className="auth-error">{err}</div>}
        <textarea rows={3} placeholder="What you are thinking. Only you can see this." value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} required aria-label="Note" />
        <div className="mini-row">
          <input inputMode="numeric" placeholder="Page (optional)" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} aria-label="Page" />
          <button type="submit" className="btn-primary" disabled={busy}>Save note</button>
        </div>
      </form>
      <ul className="note-list">
        {notes.map((n) => (
          <li key={n.id} className="note-item">
            <span className="note-page">{n.page ? `p. ${n.page}` : 'General'}</span>
            <p className="note-text">{n.body}</p>
            <button type="button" className="link-btn muted" onClick={async () => { await deleteNote(n.id); reload(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Eigener Durchgang: lesen, bearbeiten, löschen.
function OwnReview({ log, profile, reload }) {
  const [edit, setEdit] = useState(false);
  const [rating, setRating] = useState(Number(log.rating) || 0);
  const [finishedOn, setFinishedOn] = useState(log.finished_on);
  const [review, setReview] = useState(log.review || '');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await updateLog(log.id, { rating, finishedOn, review });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(false); reload();
  };
  const remove = async () => {
    setBusy(true);
    const { error } = await deleteLog(log.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    reload();
  };

  if (edit) {
    return (
      <form className="review mini-form" onSubmit={save}>
        {err && <div className="auth-error">{err}</div>}
        <StarInput value={rating} onChange={setRating} />
        <label className="form-label" htmlFor={`fin-${log.id}`}>Finished on</label>
        <input id={`fin-${log.id}`} type="date" value={finishedOn} max={localDate()} onChange={(e) => setFinishedOn(e.target.value)} required />
        <label className="form-label" htmlFor={`rev-${log.id}`}>Review</label>
        <textarea id={`rev-${log.id}`} rows={5} value={review} onChange={(e) => setReview(e.target.value)} maxLength={10000} />
        <div className="mini-actions">
          {confirm
            ? <button type="button" className="btn-danger" onClick={remove} disabled={busy}>Delete for good</button>
            : <button type="button" className="link-btn muted" onClick={() => setConfirm(true)}>Delete entry</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className="link-btn muted" onClick={() => { setEdit(false); setConfirm(false); }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>Save</button>
        </div>
      </form>
    );
  }
  return (
    <article className="review">
      <div className="review-head">
        <Avatar profile={profile} size={28} />
        <span className="review-who">You</span>
        <span className="stars">{renderStars(log.rating)}</span>
        {log.is_reread && <span className="review-tag">Reread</span>}
      </div>
      <p className="review-date">
        Finished {format(parse(log.finished_on), 'd MMM yyyy')}
        {log.started_on ? ` · started ${format(parse(log.started_on), 'd MMM')}` : ''}
        <button type="button" className="link-btn muted review-edit" onClick={() => setEdit(true)}>Edit</button>
      </p>
      {log.review
        ? <p className="review-text">{log.review}</p>
        : <p className="review-text muted-text">No review written yet. Tap Edit to add one.</p>}
    </article>
  );
}
