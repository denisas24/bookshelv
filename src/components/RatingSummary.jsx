import { useState } from 'react';
import { renderStars } from '../lib/books.js';

// Nur die Sterne; ein Tipp zeigt Durchschnitt und Anzahl der Bewertungen.
export default function RatingSummary({ avg, count }) {
  const [open, setOpen] = useState(false);
  if (avg == null) return null;
  return (
    <button type="button" className={`rating-sum${open ? ' open' : ''}`} aria-expanded={open}
      aria-label={`Average ${avg.toFixed(1)} of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
      <span className="stars">{renderStars(avg)}</span>
      {open && <span className="rating-detail">{avg.toFixed(1)} average · {count} {count === 1 ? 'rating' : 'ratings'}</span>}
    </button>
  );
}
