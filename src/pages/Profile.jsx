import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { showToast } from '../lib/utils.js';
import TeaCard from '../components/TeaCard.jsx';
import TeaDetailModal from '../components/TeaDetailModal.jsx';
import TeaFormModal from '../components/TeaFormModal.jsx';

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [recentTeas, setRecentTeas] = useState([]);
  const [favTeas, setFavTeas] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const [{ data: recent }, { data: favs }, { count }] = await Promise.all([
      supabase.from('tea_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('tea_entries').select('*').eq('user_id', user.id).eq('favorite', true).order('created_at', { ascending: false }),
      supabase.from('tea_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setRecentTeas(recent || []);
    setFavTeas(favs || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    const { error } = await updateProfile({ display_name: trimmed });
    setSavingName(false);
    if (error) { showToast('Name already taken.'); return; }
    setEditingName(false);
    showToast('Name updated.');
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl });
      showToast('Avatar updated.');
    } catch {
      showToast('Upload failed. Set up Storage in Supabase first.');
    }
    setUploadingAvatar(false);
  };

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div style={{ position: 'relative' }}>
          <div
            className="avatar"
            style={{ width: 64, height: 64, fontSize: 20, cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}
            title="Click to change avatar"
          >
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
          </div>
          {uploadingAvatar && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>…</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
        </div>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus style={{ maxWidth: 220 }} />
              <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveName} disabled={savingName}>
                {savingName ? '…' : 'Save'}
              </button>
              <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                {profile?.display_name || <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>No display name</span>}
              </h1>
              <button onClick={() => { setNameInput(profile?.display_name || ''); setEditingName(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer', fontSize: 13 }}>✎</button>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{totalCount} teas logged</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Click avatar to change photo</p>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Recent activity</p>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />)}
          </div>
        ) : recentTeas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nothing logged yet.</p>
        ) : (
          <div className="tea-grid-list">
            {recentTeas.map(e => <TeaCard key={e.id} entry={e} onClick={setViewEntry} />)}
          </div>
        )}
      </section>

      {favTeas.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Favorites</p>
          <div className="tea-grid-list">
            {favTeas.map(e => <TeaCard key={e.id} entry={e} onClick={setViewEntry} />)}
          </div>
        </section>
      )}

      <div className="divider" />
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
        {!confirmDelete ? (
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>Delete account</button>
        ) : (
          <button className="btn-danger" onClick={async () => {
            await supabase.from('tea_entries').delete().eq('user_id', user.id);
            signOut();
          }}>Confirm — this is permanent</button>
        )}
      </div>

      <TeaDetailModal entry={viewEntry} open={!!viewEntry} onClose={() => setViewEntry(null)}
        onEdit={e => { setViewEntry(null); setEditEntry(e); setShowForm(true); }} onDelete={load} canEdit={true} />
      <TeaFormModal open={showForm} onClose={() => { setShowForm(false); setEditEntry(null); }} onSaved={load} entry={editEntry} />
    </div>
  );
}
