import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid | done
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;
    const markReady = () => { settled = true; setStatus('ready'); };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) markReady();
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) markReady(); });

    const timer = setTimeout(() => { if (!settled) setStatus('invalid'); }, 4000);
    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setError(error.message || 'Could not update password.'); return; }
    setStatus('done');
    setTimeout(() => navigate('/journal', { replace: true }), 1500);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Bookshelv</div>
        <p className="auth-tagline">set a new password</p>

        {status === 'checking' && <p className="auth-note">Checking your reset link…</p>}

        {status === 'invalid' && (
          <>
            <div className="auth-error">This reset link is invalid or has expired. Please request a new one.</div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/', { replace: true })}>
              Back to sign in
            </button>
          </>
        )}

        {status === 'done' && <div className="auth-success">Password updated. Signing you in…</div>}

        {status === 'ready' && (
          <form onSubmit={submit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Repeat password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving}>
              {saving ? 'Saving…' : 'Save password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
