import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { loadExplore, addToReadlist, renderStars } from '../lib/books.js';
import { showToast } from '../lib/utils.js';
import BookCover from '../components/BookCover.jsx';

// Zuletzt bewertete Bücher aller Leserinnen und Leser.
export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await loadExplore(user.id);
    if (res.error) { setError(res.error.message); setItems([]); return; }
    setItems(res.items);
  };
  useEffect(() => { load(); }, []);

  const add = async (item) => {
    const res = await addToReadlist(item.workId);
    if (res.error) { showToast(res.error.message); return; }
    showToast('Added to your readlist');
    setItems((all) => all.map((x) => (x.key === item.key ? { ...x, mine: { id: res.id, status: 'want' } } : x)));
  };

  return (
    <div className="library">
      <header className="lib-head"><h1 className="lib-logo">Explore</h1></header>
      <h2 className="section-label explore-label">Recently rated</h2>
      {error && <div className="auth-error">{error}</div>}
      {items === null ? (
        <div className="lib-list">{[0, 1, 2].map((i) => <div key={i} className="book-row skeleton-row" />)}</div>
      ) : items.length === 0 ? (
        <div className="lib-empty"><p>No ratings yet. Books appear here as soon as someone logs one.</p></div>
      ) : (
        <div className="lib-list">
          {items.map((item) => (
            <div key={item.key} className="book-row explore-row">
              <button type="button" className="book-main explore-open"
                onClick={() => navigate(item.mine ? `/book/${item.mine.id}` : `/work/${item.workId}`)}>
                <BookCover url={item.work.cover_url} title={item.work.title} />
                <span className="book-text">
                  <span className="book-title">{item.work.title}</span>
                  <span className="book-author">{item.work.author}</span>
                  <span className="stars explore-stars" aria-label={`${item.avg.toFixed(1)} of 5`}>{renderStars(item.avg)}</span>
                </span>
              </button>
              {item.mine
                ? <span className="muted-tag">In library</span>
                : <button type="button" className="btn-small" onClick={() => add(item)}>+ Readlist</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
