import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { loadLibrary, renderStars, lastDays, localDate, setReadingDay, setPageReached } from '../lib/books.js';
import BookCover from '../components/BookCover.jsx';

const TABS = [['read', 'Read'], ['reading', 'Reading'], ['want', 'Want to read']];
const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

function readTab() {
  try { return localStorage.getItem('bookshelv-tab') || 'reading'; } catch { return 'reading'; }
}

export default function Library({ reloadKey, onEdit, onAdd }) {
  const [tab, setTab] = useState(readTab);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null); // { entryId, day }
  const [page, setPage] = useState('');
  const [open, setOpen] = useState(null); // aufgeklapptes Buch im Reiter Reading

  const load = async () => {
    const res = await loadLibrary();
    if (res.error) { setError(res.error.message); setItems([]); return; }
    setError(''); setItems(res.items);
  };
  useEffect(() => { load(); }, [reloadKey]);
  useEffect(() => { try { localStorage.setItem('bookshelv-tab', tab); } catch { /* egal */ } }, [tab]);

  const list = useMemo(() => {
    const rows = (items || []).filter((i) => i.status === tab);
    if (tab === 'read') rows.sort((a, b) => (b.log?.finished_on || '').localeCompare(a.log?.finished_on || ''));
    return rows;
  }, [items, tab]);

  const days = lastDays(5);

  const toggleDay = async (item, d) => {
    const key = localDate(d);
    const on = !(key in item.days);
    // Sofort anzeigen, danach speichern.
    setItems((all) => all.map((x) => {
      if (x.id !== item.id) return x;
      const next = { ...x.days };
      if (on) next[key] = null; else delete next[key];
      return { ...x, days: next };
    }));
    const { error } = await setReadingDay(item.id, key, on);
    if (error) { setError(error.message); load(); return; }
    if (on) { setAsk({ entryId: item.id, day: key }); setPage(''); } else setAsk(null);
  };

  const savePage = async () => {
    const n = parseInt(page, 10);
    if (n > 0) {
      await setPageReached(ask.entryId, ask.day, n);
      setItems((all) => all.map((x) => (x.id === ask.entryId ? { ...x, days: { ...x.days, [ask.day]: n } } : x)));
    }
    setAsk(null);
  };

  return (
    <div className="library">
      <header className="lib-head">
        <h1 className="lib-logo">Bookshelv</h1>
      </header>
      <nav className="lib-tabs" aria-label="Library sections">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={`lib-tab${tab === k ? ' on' : ''}`} onClick={() => { setTab(k); setAsk(null); setOpen(null); }}>
            {label}
          </button>
        ))}
      </nav>

      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}

      {items === null ? (
        <div className="lib-list">{[0, 1, 2].map((i) => <div key={i} className="book-row skeleton-row" />)}</div>
      ) : list.length === 0 ? (
        <div className="lib-empty">
          <p>{tab === 'read' ? 'Books you have finished appear here.' : tab === 'reading' ? 'Nothing on the go right now.' : 'Your reading list is empty.'}</p>
          <button type="button" className="btn-primary" onClick={onAdd}>Add a book</button>
        </div>
      ) : tab === 'reading' ? (
        <div className="lib-list">
          {list.map((item) => {
            const isOpen = open === item.id;
            return (
              <div key={item.id} className={`book-block${isOpen ? ' open' : ''}`}>
                <button type="button" className="book-row" aria-expanded={isOpen}
                  onClick={() => { setOpen(isOpen ? null : item.id); setAsk(null); }}>
                  <span className="book-main">
                    <BookCover url={item.work?.cover_url} title={item.work?.title} reading />
                    <span className="book-text">
                      <span className="book-title">{item.work?.title}</span>
                      <span className="book-author">{item.work?.author}</span>
                    </span>
                  </span>
                  <span className="book-right"><span className="chev" aria-hidden="true">{isOpen ? '–' : '+'}</span></span>
                </button>
                {isOpen && (
                  <div className="track-panel">
                    <div className="track-days">
                      {days.map((d) => {
                        const k = localDate(d); const on = k in item.days; const p = item.days[k];
                        return (
                          <div key={k} className="track-day">
                            <span className="track-label">{format(d, 'EEE')}<br />{format(d, 'd')}</span>
                            <button type="button" className={`day-check${on ? ' on' : ''}`} aria-pressed={on}
                              aria-label={`${item.work?.title}, ${format(d, 'EEEE d MMMM')}`} onClick={() => toggleDay(item, d)}>
                              {on && CHECK}
                            </button>
                            <span className="day-page">{on && p ? `p. ${p}` : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                    {ask?.entryId === item.id ? (
                      <div className="page-ask">
                        <label htmlFor={`pg-${item.id}`}>Until page</label>
                        <input id={`pg-${item.id}`} inputMode="numeric" placeholder="optional" value={page}
                          onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => e.key === 'Enter' && savePage()} autoFocus />
                        <button type="button" className="btn-small" onClick={savePage}>Save</button>
                        <button type="button" className="link-btn muted" onClick={() => setAsk(null)}>Skip</button>
                      </div>
                    ) : (
                      <div className="track-foot">
                        <button type="button" className="link-btn muted" onClick={() => onEdit(item)}>Edit book</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lib-list">
          {list.map((item) => (
            <button key={item.id} type="button" className="book-row" onClick={() => onEdit(item)}>
              <span className="book-main">
                <BookCover url={item.work?.cover_url} title={item.work?.title} />
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
      )}
    </div>
  );
}
