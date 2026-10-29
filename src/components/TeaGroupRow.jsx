import { renderStars } from '../lib/utils.js';

export default function TeaGroupRow({ group, onClick }) {
  return (
    <div className="tea-row tea-group-row" onClick={() => onClick(group)}>
      <div className="tea-row-main">
        <div className="tea-row-name">{group.name}</div>
        <div className="tea-row-meta">
          {group.brand && <span>{group.brand}</span>}
          {group.brand && group.category && <span className="tea-row-dot">·</span>}
          {group.category && <span className="tea-row-cat">{group.category}</span>}
        </div>
      </div>
      <div className="tea-group-score">
        <span className="stars">{renderStars(Math.round(group.avg * 2) / 2)}</span>
      </div>
    </div>
  );
}
