import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { showToast } from '../lib/utils.js';
import TeaCard from '../components/TeaCard.jsx';
import TeaDetailModal from '../components/TeaDetailModal.jsx';

export default function Friends() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [friendTeas, setFriendTeas] = useState({});
  const [viewEntry, setViewEntry] = useState(null);

  const load = async () => {
    const [{ data: prof }, { data: sent }, { data: recv }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('friendships').select('*').eq('requester_id', user.id),
      supabase.from('friendships').select('*').eq('recipient_id', user.id),
    ]);
    setProfiles(prof || []);
    const accepted = [
      ...(sent || []).filter(f => f.status === 'accepted').map(f => ({ id: f.id, friendId: f.recipient_id })),
      ...(recv || []).filter(f => f.status === 'accepted').map(f => ({ id: f.id, friendId: f.requester_id })),
    ];
    setFriendships(accepted);
    setPending((recv || []).filter(f => f.status === 'pending'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getProfile = (id) => profiles.find(p => p.id === id) || {};

  const sendRequest = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const target = profiles.find(p => p.display_name === trimmed);
    if (!target) { showToast('No user found with that name.'); return; }
    if (target.id === user.id) { showToast('You cannot add yourself.'); return; }
    setAdding(true);
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: target.id });
    setAdding(false);
    if (error) { showToast('Could not send request.'); return; }
    setNameInput('');
    showToast('Friend request sent.');
    load();
  };

  const accept = async (id) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    showToast('Friend request accepted.');
    load();
  };

  const decline = async (id) => {
    await supabase.from('friendships').delete().eq('id', id);
    load();
  };

  const toggleFriend = async (friendId) => {
    if (expandedId === friendId) { setExpandedId(null); return; }
    setExpandedId(friendId);
    if (!friendTeas[friendId]) {
      const { data } = await supabase.from('tea_entries').select('*').eq('user_id', friendId).order('created_at', { ascending: false }).limit(20);
      setFriendTeas(prev => ({ ...prev, [friendId]: data || [] }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Friends</h1>
      </div>

      {/* Add friend */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Add a friend</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Their display name…"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendRequest()}
          />
          <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={sendRequest} disabled={adding || !nameInput.trim()}>
            {adding ? '…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Pending ({pending.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(req => {
              const p = getProfile(req.requester_id);
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
                  <span style={{ fontSize: 14 }}>{p.display_name || req.requester_id}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => accept(req.id)}>Accept</button>
                    <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => decline(req.id)}>Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : friendships.length === 0 ? (
        <div className="empty-state"><p>No friends yet. Send a request above.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {friendships.map(({ id, friendId }) => {
            const p = getProfile(friendId);
            const isOpen = expandedId === friendId;
            return (
              <div key={id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleFriend(friendId)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 500 }}>{p.display_name || friendId}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                    {!friendTeas[friendId] ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
                    ) : friendTeas[friendId].length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.display_name || 'They'} hasn't logged any teas yet.</p>
                    ) : (
                      <div className="tea-grid-list">
                        {friendTeas[friendId].map(e => <TeaCard key={e.id} entry={e} onClick={setViewEntry} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TeaDetailModal entry={viewEntry} open={!!viewEntry} onClose={() => setViewEntry(null)} canEdit={false} />
    </div>
  );
}
