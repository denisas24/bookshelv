import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { useTheme } from './lib/theme.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Journal from './pages/Journal.jsx';
import Explore from './pages/Explore.jsx';
import Favorites from './pages/Favorites.jsx';
import Friends from './pages/Friends.jsx';
import Profile from './pages/Profile.jsx';
import Wishlist from './pages/Wishlist.jsx';
import TeaPage from './pages/TeaPage.jsx';
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
          <Route path="/" element={<Navigate to="/journal" replace />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/tea/:key" element={<TeaPage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
