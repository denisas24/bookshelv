import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Library from './pages/Library.jsx';
import Soon from './pages/Soon.jsx';
import Profile from './pages/Profile.jsx';
import BookSheet from './components/BookSheet.jsx';
import BottomNav from './components/BottomNav.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState({ open: false, entry: null });
  const [reloadKey, setReloadKey] = useState(0);
  // Neues Buch startet mit dem Status des gerade offenen Reiters.
  const openAdd = () => {
    let tab = 'want';
    try { tab = localStorage.getItem('bookshelv-tab') || 'reading'; } catch { /* egal */ }
    setSheet({ open: true, entry: null, status: tab });
  };
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
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<Library reloadKey={reloadKey} onEdit={openEdit} onAdd={openAdd} />} />
          <Route path="/explore" element={<Soon title="Explore" text="Search and discover books. Coming soon." />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </main>
      <BottomNav onAdd={() => { if (location.pathname !== '/library') navigate('/library'); openAdd(); }} />
      <BookSheet open={sheet.open} entry={sheet.entry} initialStatus={sheet.status} onClose={() => setSheet({ open: false, entry: null })} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
