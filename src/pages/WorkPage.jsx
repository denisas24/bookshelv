import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../lib/auth.jsx';
import { loadWork, addToReadlist, genreLabel, renderStars } from '../lib/books.js';
import { showToast } from '../lib/utils.js';
import BookCover from '../components/BookCover.jsx';
import Avatar from '../components/Avatar.jsx';
import RatingSummary from '../components/RatingSummary.jsx';

// Buchseite für Bücher, die (noch) nicht in der eigenen Bibliothek stehen.
export default function WorkPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await loadWork(id, user.id);
      if (res.error) { setError(res.error.message); return; }
      if (res.mineId) { navigate(`/book/${res.mineId}`, { replace: true }); return; }
      setData(res);
    })();
  }, [id]);

  if (error) return <div className="library"><div className="auth-error">{error}</div></div>;
  if (!data) return <div className="library"><div className="book-row skeleton-row" /></div>;

  const { work: w, avg, ratingCount, others } = data;
  const add = async () => {
    const res = await addToReadlist(w.id);
    if (res.error) { showToast(res.error.message); return; }
    showToast('Added to your readlist');
    navigate(`/book/${res.id}`, { replace: true });
  };

  return (
    <div className="library book-page">
      <div className="bp-top">
        <button type="button" className="link-btn muted" onClick={() => navigate(-1)}>← Back</button>
        <button type="button" className="btn-small" onClick={add}>+ Readlist</button>
      </div>
      <header className="bp-head">
        <BookCover url={w.cover_url} title={w.title} size="lg" />
        <div className="bp-meta">
          <h1 className="bp-title">{w.title}</h1>
          <p className="bp-author">{w.author}</p>
          <p className="bp-facts">{[genreLabel(w.genre), w.pages ? `${w.pages} pages` : null].filter(Boolean).join(' · ')}</p>
          <RatingSummary avg={avg} count={ratingCount} />
        </div>
      </header>
      <h2 className="section-label">Reviews</h2>
      <div className="bp-panel">
        {others.length === 0 && <div className="lib-empty"><p>No reviews yet.</p></div>}
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
    </div>
  );
}
