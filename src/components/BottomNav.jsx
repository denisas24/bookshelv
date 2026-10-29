import { NavLink } from 'react-router-dom';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const LibraryIcon = () => <Icon><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 5.2l3.6 1-3.4 13.6-3.6-1z"/></Icon>;
const ExploreIcon = () => <Icon><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></Icon>;
const AddIcon = () => <Icon><path d="M12 5v14M5 12h14"/></Icon>;
const UserIcon = () => <Icon><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.4-3.6 12.6-3.6 14 0"/></Icon>;

export default function BottomNav({ onAdd }) {
  const link = (to, label, I) => (
    <NavLink to={to} aria-label={label} title={label} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <I />
    </NavLink>
  );
  return (
    <nav className="bottom-nav">
      {link('/library', 'Library', LibraryIcon)}
      {link('/explore', 'Explore', ExploreIcon)}
      <button type="button" className="nav-item" aria-label="Add book" title="Add book" onClick={onAdd}><AddIcon /></button>
      {link('/profile', 'Profile', UserIcon)}
    </nav>
  );
}
