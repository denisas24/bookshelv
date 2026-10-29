import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, groupTeas } from '../lib/utils.js';
import TeaGroupRow from '../components/TeaGroupRow.jsx';

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [sortOrder, setSortOrder] = useState(null);

  const load = async () => {
    const { data: teas } = await supabase.from('tea_entries').select('*').order('created_at', { ascending: false }).limit(1000);
    setEntries(teas || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  let groups = groupTeas(entries).filter(g => {
    if (scope === 'mine' && !g.entries.some(e => e.user_id === user.id)) return false;
    const matchSearch = !search
      || g.name?.toLowerCase().includes(q)
      || g.brand?.toLowerCase().includes(q)
      || g.entries.some(e => e.review?.toLowerCase().includes(q));
    const matchCat = filterCat === 'all' || g.category === filterCat;
    return matchSearch && matchCat;
  });

  if (sortOrder === 'best') groups = [...groups].sort((a, b) => b.avg - a.avg);
  else if (sortOrder === 'worst') groups = [...groups].sort((a, b) => a.avg - b.avg);
  else groups = [...groups].sort((a, b) => (b.latest > a.latest ? 1 : -1));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Explore</h1>
      </div>

      <div className="scope-toggle" style={{ marginBottom: 20 }}>
        <button className={`scope-btn${scope === 'all' ? ' active' : ''}`} onClick={() => setScope('all')}>All teas</button>
        <button className={`scope-btn${scope === 'mine' ? ' active' : ''}`} onClick={() => setScope('mine')}>Mine</button>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input placeholder="Search by name, brand, or notes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="chip-row" style={{ marginBottom: 12 }}>
        <button className={`chip${filterCat === 'all' ? ' active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} className={`chip${filterCat === c ? ' active' : ''}`} onClick={() => setFilterCat(filterCat === c ? 'all' : c)}>{c}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sort:</span>
        <button className={`chip${sortOrder === 'best' ? ' active' : ''}`} onClick={() => setSortOrder(sortOrder === 'best' ? null : 'best')}>Best first</button>
        <button className={`chip${sortOrder === 'worst' ? ' active' : ''}`} onClick={() => setSortOrder(sortOrder === 'worst' ? null : 'worst')}>Worst first</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 4 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state"><p>No teas found.</p></div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{groups.length} {groups.length === 1 ? 'tea' : 'teas'}</p>
          <div className="tea-grid-list">
            {groups.map(g => (
              <TeaGroupRow key={g.key} group={g} onClick={() => navigate(`/tea/${encodeURIComponent(g.key)}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
