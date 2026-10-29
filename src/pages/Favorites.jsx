import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import TeaCard from '../components/TeaCard.jsx';
import TeaDetailModal from '../components/TeaDetailModal.jsx';
import TeaFormModal from '../components/TeaFormModal.jsx';

export default function Favorites() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('tea_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('favorite', true)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">Teas you've starred</p>
      </div>

      {loading ? (
        <div className="tea-grid-list">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 8 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>No favorites yet. Open a tea and mark it as a favorite.</p>
        </div>
      ) : (
        <div className="tea-grid-list">
          {entries.map(e => <TeaCard key={e.id} entry={e} onClick={setViewEntry} />)}
        </div>
      )}

      <TeaDetailModal
        entry={viewEntry}
        open={!!viewEntry}
        onClose={() => setViewEntry(null)}
        onEdit={e => { setViewEntry(null); setEditEntry(e); setShowForm(true); }}
        onDelete={load}
        canEdit={true}
      />
      <TeaFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditEntry(null); }}
        onSaved={load}
        entry={editEntry}
      />
    </div>
  );
}
