import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, startOfMonth, addMonths, isAfter } from 'date-fns';
import { localDate, setReadingDay, setPageReached } from '../lib/books.js';

// Lesetage eines Buchs: Kalender
// (Wochen als Spalten, Mo–So als Zeilen), waagrecht scrollbar, öffnet bei heute.
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function ReadingLog({ entryId, days, onChange }) {
  const [editing, setEditing] = useState(false);
  const [ask, setAsk] = useState(null);
  const [page, setPage] = useState('');
  const calRef = useRef(null);
  const today = new Date();
  const todayKey = localDate(today);
  const keys = Object.keys(days).sort();

  const months = useMemo(() => {
    const first = keys.length ? startOfMonth(parse(keys[0])) : startOfMonth(today);
    const out = [];
    for (let m = first; !isAfter(m, today); m = addMonths(m, 1)) {
      const n = keys.filter((k) => k.startsWith(format(m, 'yyyy-MM'))).length;
      out.push({ m, n });
    }
    return out;
  }, [keys.join(',')]);

  const weeks = useMemo(() => {
    const start = months[0].m;
    const mon = addDays(start, -((start.getDay() + 6) % 7));
    const end = addDays(today, 6 - ((today.getDay() + 6) % 7));
    const cols = [];
    for (let d = mon; !isAfter(d, end); d = addDays(d, 7)) {
      cols.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    }
    return cols;
  }, [months]);

  useEffect(() => { const el = calRef.current; if (el) el.scrollLeft = el.scrollWidth; }, [weeks.length]);

  const toggle = async (d) => {
    const k = localDate(d);
    if (isAfter(d, today)) return;
    if (!editing && k !== todayKey) return;
    const on = !(k in days);
    const next = { ...days };
    if (on) next[k] = null; else delete next[k];
    onChange(next);
    const { error } = await setReadingDay(entryId, k, on);
    if (error) { onChange(days); return; }
    if (on) { setAsk(k); setPage(''); } else setAsk(null);
  };
  const savePage = async () => {
    const n = parseInt(page, 10);
    if (n > 0) { await setPageReached(entryId, ask, n); onChange({ ...days, [ask]: n }); }
    setAsk(null);
  };

  const lastPage = keys.map((k) => days[k]).filter(Boolean).pop();

  return (
    <section className="rlog">
      <div className="rlog-head">
        <h2 className="section-label">Reading days</h2>
        <span className="rlog-sum">{keys.length} {keys.length === 1 ? 'day' : 'days'}{lastPage ? ` · at page ${lastPage}` : ''}</span>
      </div>

      <div className="rlog-cal">
        <div className="rlog-scroll" ref={calRef}>
          <div className="rlog-months">
            {weeks.map((w, i) => {
              const first = w.find((d) => d.getDate() === 1);
              return <span key={i}>{i === 0 ? format(w[0], 'MMM') : first ? format(first, 'MMM') : ''}</span>;
            })}
          </div>
          <div className="rlog-grid">
            {weeks.map((w) => w.map((d) => {
              const k = localDate(d); const on = k in days; const fut = isAfter(d, today);
              return (
                <button key={k} type="button" disabled={fut}
                  className={`rlog-cell${on ? ' on' : ''}${k === todayKey ? ' today' : ''}${fut ? ' future' : ''}`}
                  aria-pressed={on} aria-label={format(d, 'EEEE d MMMM yyyy')} onClick={() => toggle(d)}>
                  {d.getDate()}
                </button>
              );
            }))}
          </div>
        </div>
        <div className="rlog-wd" aria-hidden="true"><span />{WD.map((w) => <span key={w}>{w}</span>)}</div>
      </div>

      {ask ? (
        <div className="page-ask">
          <label htmlFor="rlog-page">Until page</label>
          <input id="rlog-page" inputMode="numeric" placeholder="optional" value={page} autoFocus
            onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && savePage()} />
          <button type="button" className="btn-small" onClick={savePage}>Save</button>
          <button type="button" className="link-btn muted" onClick={() => setAsk(null)}>Skip</button>
        </div>
      ) : (
        <div className="rlog-foot">
          <span>{editing ? 'Tap any past day to add or remove it.' : 'Tap today to mark it.'}</span>
          <button type="button" className="btn-small" onClick={() => setEditing((e) => !e)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
      )}
    </section>
  );
}
