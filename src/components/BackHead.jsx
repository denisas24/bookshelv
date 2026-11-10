import { useNavigate } from 'react-router-dom';

// Kopf für Unterseiten der Startseite: zurück und Titel.
export default function BackHead({ title }) {
  const navigate = useNavigate();
  return (
    <header className="back-head">
      <button type="button" className="back-btn" aria-label="Back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1 className="lib-logo">{title}</h1>
    </header>
  );
}
