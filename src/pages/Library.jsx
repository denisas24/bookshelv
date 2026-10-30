import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadLibrary, enrichMissing, surnameKey, renderStars } from '../lib/books.js';
import BookCover from '../components/BookCover.jsx';

const TABS = [['read', 'Read'], ['reading', 'Reading'], ['want', 'Readlist']];
function readTab() {
  try { return localStorage.getItem('bookshelv-tab') || 'reading'; } catch { return 'reading'; }
}

export default function Library({ reloadKey, onAdd }) {
  const navigate = useNavigate();
  const openBook = (item) => navigate(`/book/${item.id}`);
  const [tab, setTab] = useState(readTab);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await loadLibrary();
    if (res.error) { setError(res.error.message); setItems([]); return; }
    setError(''); setItems(res.items);
    // Fehlende Cover und Genres im Hintergrund nachtragen.
    const patches = await enrichMissing(res.items);
    if (Object.keys(patches).length) {
      setItems((all) => all.map((x) => (patches[x.work?.id] ? { ...x, work: { ...x.work, ...patches[x.work.id] } } : x)));
    }
  };
  useEffect(() => { load(); }, [reloadKey]);
  useEffect(() => { try { localStorage.setItem('bookshelv-tab', tab); } catch { /* egal */ } }, [tab]);

  const list = useMemo(() => {
    // Alphabetisch nach Nachname der Autorin oder des Autors, dann nach Titel.
    const rows = (items || []).filter((i) => i.status === tab);
    rows.sort((a, b) => surnameKey(a.work?.author).localeCompare(surnameKey(b.work?.author))
      || (a.work?.title || '').localeCompare(b.work?.title || ''));
    return rows;
  }, [items, tab]);

  return (
    <div className="library">
      <header className="lib-head">
        <h1 className="lib-logo">Bookshelv</h1>
        <button type="button" className="icon-btn" aria-label="Add book" title="Add book" onClick={onAdd}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </header>
      <nav className="lib-tabs" aria-label="Library sections">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={`lib-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>

      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}

      {items === null ? (
        <div className="lib-list">{[0, 1, 2].map((i) => <div key={i} className="book-row skeleton-row" />)}</div>
      ) : list.length === 0 ? (
        <div className="lib-empty">
          <p>{tab === 'read' ? 'Books you have finished appear here.' : tab === 'reading' ? 'Nothing on the go right now.' : 'Your readlist is empty.'}</p>
          <button type="button" className="btn-primary" onClick={onAdd}>Add a book</button>
        </div>
      ) : tab === 'reading' ? (
        <>
          <BookList items={list.filter((i) => !i.partial)} tab={tab} openBook={openBook} />
          {list.some((i) => i.partial) && (
            <>
              <h2 className="section-label lib-sub">Parts</h2>
              <BookList items={list.filter((i) => i.partial)} tab={tab} openBook={openBook} />
            </>
          )}
        </>
      ) : (
        <BookList items={list} tab={tab} openBook={openBook} />
      )}
    </div>
  );
}

function BookList({ items, tab, openBook }) {
  if (!items.length) return null;
  return (
        <div className="lib-list">
          {items.map((item) => (
            <button key={item.id} type="button" className="book-row" onClick={() => openBook(item)}>
              <span className="book-main">
                <BookCover url={item.work?.cover_url} title={item.work?.title} reading={tab === 'reading'} />
                <span className="book-text">
                  <span className="book-title">{item.work?.title}</span>
                  <span className="book-author">{item.work?.author}</span>
                </span>
              </span>
              <span className="book-right">
                {item.favorite && <span className="book-fav" aria-label="Favorite">♥</span>}
                {tab === 'read' && <span className="stars">{renderStars(item.log?.rating)}</span>}
              </span>
            </button>
          ))}
        </div>
  );
}
