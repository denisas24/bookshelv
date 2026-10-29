import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES, showToast } from '../lib/utils.js';
import StarInput from './StarInput.jsx';

export default function TeaFormModal({ open, onClose, onSaved, entry }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(3);
  const [review, setReview] = useState('');
  const [dateTried, setDateTried] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showNameSugg, setShowNameSugg] = useState(false);
  const [showBrandSugg, setShowBrandSugg] = useState(false);

  useEffect(() => {
    if (entry) {
      setName(entry.name || '');
      setBrand(entry.brand || '');
      setCategory(entry.category || '');
      setRating(entry.rating || 3);
      setReview(entry.review || '');
      setDateTried(entry.date_tried || '');
      setTags(entry.tags || []);
    } else {
      setName(''); setBrand(''); setCategory(''); setRating(3);
      setReview(''); setDateTried(''); setTags([]);
    }
  }, [entry, open]);

  if (!open) return null;

  const searchNames = async (q) => {
    if (!q || q.length < 2) { setNameSuggestions([]); return; }
    const { data } = await supabase.from('tea_entries').select('name').ilike('name', `%${q}%`).limit(5);
    const unique = [...new Set((data || []).map(d => d.name))];
    setNameSuggestions(unique);
    setShowNameSugg(true);
  };

  const searchBrands = async (q) => {
    if (!q || q.length < 2) { setBrandSuggestions([]); return; }
    const { data } = await supabase.from('tea_entries').select('brand').ilike('brand', `%${q}%`).not('brand', 'is', null).limit(5);
    const unique = [...new Set((data || []).map(d => d.brand))];
    setBrandSuggestions(unique);
    setShowBrandSugg(true);
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (!tags.includes(t)) setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      category: category || null,
      rating,
      review: review.trim() || null,
      date_tried: dateTried || null,
      tags: tags.length ? tags : null,
      user_id: user.id,
    };
    let error;
    if (entry?.id) {
      ({ error } = await supabase.from('tea_entries').update(payload).eq('id', entry.id));
    } else {
      ({ error } = await supabase.from('tea_entries').insert(payload));
    }
    setSaving(false);
    if (error) { showToast('Something went wrong.'); return; }
    showToast(entry?.id ? 'Tea updated.' : 'Tea logged.');
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 20 }}>{entry?.id ? 'Edit tea' : 'Log a tea'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Name *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); searchNames(e.target.value); }}
              onBlur={() => setTimeout(() => setShowNameSugg(false), 150)}
              placeholder="e.g. Gyokuro"
              required
              autoComplete="off"
            />
            {showNameSugg && nameSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, overflow: 'hidden' }}>
                {nameSuggestions.map(s => (
                  <div key={s} onClick={() => { setName(s); setShowNameSugg(false); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.target.style.background = 'var(--bg-card)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >{s}</div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Brand</label>
            <input
              value={brand}
              onChange={e => { setBrand(e.target.value); searchBrands(e.target.value); }}
              onBlur={() => setTimeout(() => setShowBrandSugg(false), 150)}
              placeholder="e.g. Palais des Thés"
              autoComplete="off"
            />
            {showBrandSugg && brandSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, overflow: 'hidden' }}>
                {brandSuggestions.map(s => (
                  <div key={s} onClick={() => { setBrand(s); setShowBrandSugg(false); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.target.style.background = 'var(--bg-card)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >{s}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">— none —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date tried</label>
              <input type="date" value={dateTried} onChange={e => setDateTried(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea value={review} onChange={e => setReview(e.target.value)} rows={3} placeholder="Tasting notes, mood, brewing method…" style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Flavor tags <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(z.B. floral, erdig, süß — Enter drücken)</span></label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Type and press Enter"
              autoComplete="off"
            />
            {tags.length > 0 && (
              <div className="tag-list">
                {tags.map(t => (
                  <span key={t} className="tag">
                    {t}
                    <button type="button" onClick={() => removeTag(t)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : entry?.id ? 'Save changes' : 'Log tea'}
          </button>
        </form>
      </div>
    </div>
  );
}
