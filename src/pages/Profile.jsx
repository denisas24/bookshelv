import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { uploadAvatar } from '../lib/books.js';
import { showToast } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';

// Profil: Einstellungen direkt auf der Seite, ohne Zahnrad.
// Foto und Darstellung wirken sofort, der Name mit „Save“.
export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setName(profile?.display_name || ''); }, [profile]);

  const saveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await updateProfile({ display_name: trimmed.slice(0, 60) });
    setSaving(false);
    showToast(error ? 'Could not save.' : 'Saved');
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

  const unchanged = name.trim() === (profile?.display_name || '');

  return (
    <div className="library profile-page">
      <h1 className="lib-logo">Profile</h1>

      <div className="profile-photo">
        <Avatar profile={profile} size={96} />
        <button type="button" className="link-btn caps" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
      </div>

      <form className="profile-form" onSubmit={saveName}>
        <div className="form-group">
          <label className="form-label" htmlFor="pf-name">Username</label>
          <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </div>

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

        <button type="submit" className="btn-primary profile-save" disabled={saving || unchanged}>{saving ? 'Saving…' : 'Save'}</button>
      </form>

      <div className="profile-signout">
        <button type="button" className="link-btn caps muted" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
