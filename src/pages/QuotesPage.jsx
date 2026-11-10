import { useEffect, useState } from 'react';
import { loadMyQuotes, pageLabel } from '../lib/books.js';
import BackHead from '../components/BackHead.jsx';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState(null);
  useEffect(() => { loadMyQuotes().then(({ data }) => setQuotes(data || [])); }, []);

  return (
    <div className="library">
      <BackHead title="Quotes" />
      {quotes && quotes.length === 0 && (
        <p className="muted-text">Quotes you save from a book will gather here, with the page they came from.</p>
      )}
      <ul className="quote-list">
        {(quotes || []).map((q) => (
          <li key={q.id} className="quote-item">
            <blockquote>{'\u201C'}{q.body}{'\u201D'}{pageLabel(q) && <span className="quote-page"> {pageLabel(q)}</span>}</blockquote>
            {q.thought && <p className="quote-thought">{q.thought}</p>}
            <p className="quote-src">{q.work?.title}{q.work?.author ? ` · ${q.work.author}` : ''}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
