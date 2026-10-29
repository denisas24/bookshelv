import { renderStars } from '../lib/utils.js';

const HeartIcon = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

export default function TeaCard({ entry, onClick, author, showAuthor, onSaveToWishlist }) {
  const initials = author?.display_name
    ? author.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={`tea-row${showAuthor ? ' with-author' : ''}`} onClick={() => onClick(entry)}>
      {showAuthor && (
        <span className="tea-row-avatar" title={author?.display_name || ''}>
          {author?.avatar_url ? <img src={author.avatar_url} alt="" /> : initials}
        </span>
      )}
      <div className="tea-row-main">
        <div className="tea-row-name">{entry.name}</div>
        <div className="tea-row-meta">
          {entry.brand && <span>{entry.brand}</span>}
          {entry.brand && entry.category && <span className="tea-row-dot">·</span>}
          {entry.category && <span className="tea-row-cat">{entry.category}</span>}
        </div>
      </div>

      <div className="tea-row-rating stars">{renderStars(entry.rating)}</div>

      {onSaveToWishlist ? (
        <button
          className="tea-row-action"
          onClick={e => { e.stopPropagation(); onSaveToWishlist(entry); }}
          title="Save to wishlist"
        >
          <HeartIcon />
        </button>
      ) : (
        <span className="tea-row-fav" title={entry.favorite ? 'Favorite' : undefined}>
          {entry.favorite && <HeartIcon filled />}
        </span>
      )}
    </div>
  );
}
