import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { showToast } from '../lib/utils.js';

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await supabase.from('wishlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    showToast('Removed from wishlist.');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Want to Try</h1>
        <p className="page-subtitle">Teas saved from others' journals</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Nothing saved yet. Browse Explore and save teas you want to try.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{item.tea_name}</div>
                {item.tea_brand && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.tea_brand}</div>}
                {item.saved_from && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>saved from {item.saved_from}</div>}
              </div>
              <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => remove(item.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
