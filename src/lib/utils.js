export const CATEGORIES = ['green','black','white','oolong','herbal','chai','matcha','fruit','rooibos','other'];

export const CATEGORY_EMOJI = {
  green: '🍵', black: '☕', white: '🤍', oolong: '🌀',
  herbal: '🌿', chai: '🫖', matcha: '💚', fruit: '🍓',
  rooibos: '🟤', other: '🍃'
};

export function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '');
}

let toastTimer = null;
export function showToast(msg) {
  const existing = document.getElementById('__toast__');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.id = '__toast__';
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 2500);
}

const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
export function teaKey(entry) {
  return `${norm(entry.name)}|${norm(entry.brand)}`;
}

export function groupTeas(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = teaKey(e);
    if (!map.has(key)) map.set(key, { key, name: e.name, brand: e.brand, category: e.category, entries: [] });
    map.get(key).entries.push(e);
  }
  return [...map.values()].map(g => {
    const rated = g.entries.filter(e => e.rating);
    const avg = rated.length ? rated.reduce((s, e) => s + Number(e.rating), 0) / rated.length : 0;
    const latest = g.entries.reduce((m, e) => (e.created_at > m ? e.created_at : m), '');
    return { ...g, avg, latest };
  });
}

export function initialsOf(profile) {
  return profile?.display_name
    ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
}
