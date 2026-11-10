import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Home from './pages/Home.jsx';
import Library from './pages/Library.jsx';
import DiaryPage from './pages/DiaryPage.jsx';
import QuotesPage from './pages/QuotesPage.jsx';
import FavouritesPage from './pages/FavouritesPage.jsx';
import Explore from './pages/Explore.jsx';
import Profile from './pages/Profile.jsx';
import BookPage from './pages/BookPage.jsx';
import WorkPage from './pages/WorkPage.jsx';
import BookSheet from './components/BookSheet.jsx';
import BottomNav from './components/BottomNav.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState({ open: false, entry: null });
  const [reloadKey, setReloadKey] = useState(0);
  // Von der Startseite aus immer „Reading“, aus der Bibliothek der offene Reiter.
  const openAdd = (status) => {
    let tab = typeof status === 'string' ? status : null;
    if (!tab) { try { tab = localStorage.getItem('bookshelv-tab') || 'reading'; } catch { tab = 'reading'; } }
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
          <Route path="/" element={<Home reloadKey={reloadKey} onAdd={openAdd} />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/favourites" element={<FavouritesPage />} />
          <Route path="/library" element={<Library reloadKey={reloadKey} onAdd={openAdd} />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/book/:id" element={<BookPage reloadKey={reloadKey} onEdit={openEdit} />} />
          <Route path="/work/:id" element={<WorkPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <BookSheet open={sheet.open} entry={sheet.entry} initialStatus={sheet.status} onClose={() => setSheet({ open: false, entry: null })} onSaved={() => setReloadKey((k) => k + 1)} onRemoved={() => navigate('/')} />
    </div>
  );
}
