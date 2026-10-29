import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { useTheme } from './lib/theme.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Library from './pages/Library.jsx';
import Soon from './pages/Soon.jsx';
import Me from './pages/Me.jsx';
import BookSheet from './components/BookSheet.jsx';
import BottomNav from './components/BottomNav.jsx';

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function App() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState({ open: false, entry: null });
  const [reloadKey, setReloadKey] = useState(0);
  const openAdd = () => setSheet({ open: true, entry: null });
  const openEdit = (entry) => setSheet({ open: true, entry });

  if (location.pathname === '/reset-password') return <ResetPassword />;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="app-shell">
      <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 150 }}>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<Library reloadKey={reloadKey} onEdit={openEdit} onAdd={openAdd} />} />
          <Route path="/explore" element={<Soon title="Explore" text="Search and discover books. Coming soon." />} />
          <Route path="/quotes" element={<Soon title="Quotes" text="Your saved quotes will live here. Coming soon." />} />
          <Route path="/profile" element={<Me />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </main>
      <BottomNav onAdd={() => { if (location.pathname !== '/library') navigate('/library'); openAdd(); }} />
      <BookSheet open={sheet.open} entry={sheet.entry} onClose={() => setSheet({ open: false, entry: null })} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
