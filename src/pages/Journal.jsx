import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES } from '../lib/utils.js';
import TeaCard from '../components/TeaCard.jsx';
import TeaFormModal from '../components/TeaFormModal.jsx';
import TeaDetailModal from '../components/TeaDetailModal.jsx';

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from('tea_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search || e.name?.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q);
    const matchCat = filterCat === 'all' || e.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">My Journal</h1>
          <p className="page-subtitle">{entries.length} {entries.length === 1 ? 'tea' : 'teas'} logged</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditEntry(null); setShowForm(true); }}>
          + Log tea
        </button>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input placeholder="Search teas…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <button className={`chip${filterCat === 'all' ? ' active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} className={`chip${filterCat === c ? ' active' : ''}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="tea-grid-list">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 8 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>{entries.length === 0 ? 'Your journal is empty.' : 'No teas match your search.'}</p>
          {entries.length === 0 && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>Log your first tea</button>
          )}
        </div>
      ) : (
        <div className="tea-grid-list">
          {filtered.map(e => <TeaCard key={e.id} entry={e} onClick={setViewEntry} />)}
        </div>
      )}

      <TeaFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditEntry(null); }}
        onSaved={load}
        entry={editEntry}
      />
      <TeaDetailModal
        entry={viewEntry}
        open={!!viewEntry}
        onClose={() => setViewEntry(null)}
        onEdit={e => { setViewEntry(null); setEditEntry(e); setShowForm(true); }}
        onDelete={load}
        canEdit={true}
      />
    </div>
  );
}
