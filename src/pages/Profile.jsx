import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { loadMyQuotes, uploadAvatar } from '../lib/books.js';
import { showToast } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [quotes, setQuotes] = useState(null);
  const [settings, setSettings] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    loadMyQuotes().then(({ data }) => setQuotes(data || []));
  }, []);
  useEffect(() => { if (settings) setName(profile?.display_name || ''); }, [settings, profile]);

  const saveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await updateProfile({ display_name: trimmed.slice(0, 60) });
    setSaving(false);
    showToast(error ? 'Could not save the name.' : 'Name saved');
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Please choose a photo under 2 MB.'); return; }
    setUploading(true);
    const res = await uploadAvatar(user.id, file);
    if (!res.error) await updateProfile({ avatar_url: res.url });
    setUploading(false);
    showToast(res.error ? 'Upload failed.' : 'Photo updated');
  };

  return (
    <div className="library">
      <header className="profile-head">
        <Avatar profile={profile} size={56} />
        <div className="profile-name">
          <h1 className="lib-logo">{profile?.display_name || 'Reader'}</h1>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings" title="Settings" onClick={() => setSettings(true)}><GearIcon /></button>
      </header>

      <section className="profile-section">
        <h2 className="section-label">Quotes</h2>
        {quotes === null ? null : quotes.length === 0 ? (
          <p className="muted-text">Quotes you save from a book will gather here, with the page they came from.</p>
        ) : (
          <ul className="quote-list">
            {quotes.map((q) => (
              <li key={q.id} className="quote-item">
                <blockquote>{q.body}</blockquote>
                <p className="quote-src">{q.work?.title}{q.page ? `, p. ${q.page}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {settings && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSettings(false)}>
          <div className="modal book-sheet">
            <div className="modal-header">
              <h2>Settings</h2>
              <button type="button" className="modal-close" onClick={() => setSettings(false)} aria-label="Close">×</button>
            </div>

            <div className="form-group">
              <span className="form-label">Profile photo</span>
              <div className="photo-row">
                <Avatar profile={profile} size={48} />
                <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Choose photo'}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
              </div>
            </div>

            <form className="form-group" onSubmit={saveName}>
              <label className="form-label" htmlFor="pf-name">Username</label>
              <div className="photo-row">
                <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
                <button type="submit" className="btn-primary" disabled={saving || name.trim() === (profile?.display_name || '')}>Save</button>
              </div>
            </form>

            <div className="form-group">
              <span className="form-label">Appearance</span>
              <div className="seg">
                <button type="button" className={`seg-btn${theme === 'light' ? ' on' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>Paper</button>
                <button type="button" className={`seg-btn${theme === 'dark' ? ' on' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>Dark</button>
              </div>
            </div>

            <div className="form-group">
              <span className="form-label">Account</span>
              <p className="muted-text">{user?.email}</p>
            </div>

            <div className="sheet-actions">
              <button type="button" className="btn-ghost" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
