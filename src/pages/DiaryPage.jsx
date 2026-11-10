import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { loadDiary, loadLibrary, renderStars } from '../lib/books.js';
import BookCover from '../components/BookCover.jsx';
import BackHead from '../components/BackHead.jsx';

// Jeder Lesedurchgang, jüngster zuerst, nach Monaten gegliedert.
export default function DiaryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState(null);
  const [entryByKey, setEntryByKey] = useState({});

  useEffect(() => {
    loadDiary().then(({ data }) => setLogs(data || []));
    loadLibrary().then((res) => {
      const m = {};
      for (const e of res.items || []) if (e.work?.work_key) m[e.work.work_key] = e.id;
      setEntryByKey(m);
    });
  }, []);

  const groups = useMemo(() => {
    const out = [];
    for (const l of logs || []) {
      const month = format(new Date(`${l.finished_on}T12:00:00`), 'MMMM yyyy');
      if (!out.length || out[out.length - 1].month !== month) out.push({ month, items: [] });
      out[out.length - 1].items.push(l);
    }
    return out;
  }, [logs]);

  return (
    <div className="library">
      <BackHead title="Diary" />
      {logs && logs.length === 0 && <p className="muted-text">Books you finish appear here, one line per reading.</p>}
      {groups.map((g) => (
        <section key={g.month}>
          <h2 className="section-label diary-month">{g.month}</h2>
          <div className="lib-list">
            {g.items.map((l) => {
              const id = entryByKey[l.work?.work_key];
              return (
                <button key={l.id} type="button" className="book-row" onClick={() => id && navigate(`/book/${id}`)}>
                  <span className="book-main">
                    <BookCover url={l.work?.cover_url} title={l.work?.title} />
                    <span className="book-text">
                      <span className="book-title">{l.work?.title}</span>
                      <span className="book-author">{l.work?.author}{l.is_reread ? ' · reread' : ''}</span>
                    </span>
                  </span>
                  <span className="book-right"><span className="stars">{renderStars(l.rating)}</span></span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
