import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { loadLibrary, enrichMissing, loadHomeCounts } from '../lib/books.js';
import BookCover from '../components/BookCover.jsx';

// Startseite: was gerade gelesen wird, groß; alles Übrige als antippbare Zeilen.
export default function Home({ reloadKey, onAdd }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await loadLibrary();
      if (!alive) return;
      if (res.error) { setError(res.error.message); setItems([]); return; }
      setError(''); setItems(res.items);
      const patches = await enrichMissing(res.items.filter((i) => i.status === 'reading'));
      if (alive && Object.keys(patches).length) {
        setItems((all) => all.map((x) => (patches[x.work?.id] ? { ...x, work: { ...x.work, ...patches[x.work.id] } } : x)));
      }
    })();
    loadHomeCounts(user.id).then((c) => alive && setCounts(c));
    return () => { alive = false; };
  }, [reloadKey, user.id]);

  const all = items || [];
  const reading = all.filter((i) => i.status === 'reading')
    .sort((a, b) => Number(a.partial) - Number(b.partial) || (b.updated_at || '').localeCompare(a.updated_at || ''));
  const favourites = all.filter((i) => i.favorite).length;
  const readlist = all.filter((i) => i.status === 'want').length;

  const openReadlist = () => {
    try { localStorage.setItem('bookshelv-tab', 'want'); } catch { /* egal */ }
    navigate('/library');
  };
  const pageOf = (i) => {
    if (i.partial) return 'Parts';
    const pages = Object.values(i.days || {}).filter((p) => p);
    return pages.length ? `p. ${Math.max(...pages)}` : '';
  };

  const rows = [
    ['Diary', counts.diary, () => navigate('/diary')],
    ['Quotes', counts.quotes, () => navigate('/quotes')],
    ['Favourites', items ? favourites : null, () => navigate('/favourites')],
    ['Readlist', items ? readlist : null, openReadlist],
  ];

  return (
    <div className="library home">
      <header className="home-head">
        <h1 className="section-label home-label">Currently reading</h1>
        <button type="button" className="icon-btn" aria-label="Add book" title="Add book" onClick={() => onAdd('reading')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </header>

      {error && <div className="auth-error">{error}</div>}

      {items === null ? (
        <div className="home-reading"><span className="home-book skeleton-row" /></div>
      ) : reading.length === 0 ? (
        <div className="lib-empty home-empty">
          <p>Nothing on the go right now.</p>
          <button type="button" className="btn-primary" onClick={() => onAdd('reading')}>Add a book</button>
        </div>
      ) : (
        <div className="home-reading">
          {reading.map((i) => (
            <button key={i.id} type="button" className="home-book" onClick={() => navigate(`/book/${i.id}`)}>
              <BookCover url={i.work?.cover_url} title={i.work?.title} size="xl" reading />
              <span className="home-title">{i.work?.title}</span>
              <span className="book-author">{i.work?.author}</span>
              {pageOf(i) && <span className="home-page">{pageOf(i)}</span>}
            </button>
          ))}
        </div>
      )}

      <nav className="home-links" aria-label="Your reading">
        {rows.map(([label, n, go]) => (
          <button key={label} type="button" className="home-link" onClick={go}>
            <span>{label}</span>
            <span className="home-count">{n ?? ''} ›</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
