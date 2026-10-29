import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { supabase } from '../lib/supabase.js';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (next) => { setMode(next); setError(''); setSuccess(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    if (mode === 'signin') {
      const result = await signIn(email, password);
      if (result.error) setError(result.error.message || 'Sign in failed.');
    } else if (mode === 'signup') {
      const result = await signUp(email, password);
      if (result.error) setError(result.error.message || 'Sign up failed.');
      else setSuccess('Account created! You can now sign in.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message || 'Could not send reset email.');
      else setSuccess('If an account exists for this email, a reset link is on its way.');
    }
    setLoading(false);
  };

  const buttonLabel = loading
    ? 'Loading…'
    : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Bookshelv</div>
        <p className="auth-tagline">
          {mode === 'forgot' ? 'reset your password' : 'taste that lingers'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={submit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" name="bookshelv-email" />
          </div>
          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="off" name="bookshelv-password" />
              {mode === 'signin' && (
                <button type="button" className="link-btn auth-forgot" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              )}
            </div>
          )}
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {buttonLabel}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' && <>Don't have an account? <button type="button" className="link-btn" onClick={() => switchMode('signup')}>Sign up</button></>}
          {mode === 'signup' && <>Already have an account? <button type="button" className="link-btn" onClick={() => switchMode('signin')}>Sign in</button></>}
          {mode === 'forgot' && <button type="button" className="link-btn" onClick={() => switchMode('signin')}>Back to sign in</button>}
        </p>
      </div>
    </div>
  );
}
