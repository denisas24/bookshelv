import { useAuth } from '../lib/auth.jsx';

export default function Me() {
  const { user, profile, signOut } = useAuth();
  return (
    <div className="library">
      <header className="lib-head"><h1 className="lib-logo">{profile?.display_name || 'Profile'}</h1></header>
      <div className="lib-empty">
        <p>{user?.email}</p>
        <button type="button" className="btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
