import { useState } from 'react';

const Star = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
);

export default function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value;

  return (
    <div className="star-input" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(n => {
        const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0;
        return (
          <span key={n} className="star-slot">
            <span className="star-base"><Star /></span>
            <span className="star-fill" style={{ width: `${fill * 100}%` }}><Star /></span>
            <button type="button" className="star-half left" aria-label={`${n - 0.5} stars`}
              onMouseEnter={() => setHover(n - 0.5)} onClick={() => onChange(n - 0.5)} />
            <button type="button" className="star-half right" aria-label={`${n} stars`}
              onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} />
          </span>
        );
      })}
      <span className="star-value">{shown ? shown.toString().replace('.', ',') : ''}</span>
    </div>
  );
}
