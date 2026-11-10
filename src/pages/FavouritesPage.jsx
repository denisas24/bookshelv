import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadLibrary, surnameKey, renderStars } from '../lib/books.js';
import BookCover from '../components/BookCover.jsx';
import BackHead from '../components/BackHead.jsx';

export default function FavouritesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => {
    loadLibrary().then((res) => {
      const fav = (res.items || []).filter((i) => i.favorite);
      fav.sort((a, b) => surnameKey(a.work?.author).localeCompare(surnameKey(b.work?.author))
        || (a.work?.title || '').localeCompare(b.work?.title || ''));
      setItems(fav);
    });
  }, []);

  return (
    <div className="library">
      <BackHead title="Favourites" />
      {items && items.length === 0 && <p className="muted-text">Mark a book as favourite in its edit sheet and it appears here.</p>}
      <div className="lib-list">
        {(items || []).map((i) => (
          <button key={i.id} type="button" className="book-row" onClick={() => navigate(`/book/${i.id}`)}>
            <span className="book-main">
              <BookCover url={i.work?.cover_url} title={i.work?.title} reading={i.status === 'reading'} />
              <span className="book-text">
                <span className="book-title">{i.work?.title}</span>
                <span className="book-author">{i.work?.author}</span>
              </span>
            </span>
            <span className="book-right"><span className="stars">{renderStars(i.log?.rating)}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
