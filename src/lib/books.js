import { format, subDays } from 'date-fns';
import { supabase } from './supabase.js';

// Feste Genre-Liste: gespeichert werden die Schlüssel, angezeigt die Namen.
export const GENRES = [
  ['nonfiction', 'Nonfiction'], ['esoteric', 'Esoteric'], ['thriller', 'Thriller'],
  ['horror', 'Horror'], ['scifi', 'Sci-Fi'], ['fantasy', 'Fantasy'],
  ['literature', 'Literature'], ['children', "Children's"], ['hobby', 'Hobby'], ['other', 'Other'],
];
export const genreLabel = (key) => (GENRES.find(([k]) => k === key) || [null, ''])[1];

export const STATUSES = [['read', 'Read'], ['reading', 'Reading'], ['want', 'Want to read']];

// Lokales Datum (nicht UTC), wie im Schema festgelegt.
export const localDate = (d = new Date()) => format(d, 'yyyy-MM-dd');
export const lastDays = (n = 5) => Array.from({ length: n }, (_, i) => subDays(new Date(), i));

// Spiegel von public.normalize_key / public.normalize_author in der Datenbank.
// Muss mit dem SQL übereinstimmen, sonst findet die App vorhandene Werke nicht.
const ACCENTS = { á:'a',à:'a',â:'a',ã:'a',å:'a',é:'e',è:'e',ê:'e',ë:'e',í:'i',ì:'i',î:'i',ï:'i',ó:'o',ò:'o',ô:'o',õ:'o',ú:'u',ù:'u',û:'u',ñ:'n',ç:'c',ø:'o' };
function baseNorm(t) {
  return (t || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[áàâãåéèêëíìîïóòôõúùûñçø]/g, (c) => ACCENTS[c])
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function normalizeKey(t) {
  return baseNorm(t)
    .replace(/^(der|die|das|the|a|an|ein|eine) /, '')
    .replace(/ (der|die|das|the|a|an|ein|eine)$/, '');
}
export function normalizeAuthor(t) {
  return baseNorm(t).split(' ').filter(Boolean).sort().join(' ');
}
export const workKey = (title, author) => `${normalizeKey(title)}|${normalizeAuthor(author)}`;

// ---------- Lesen ----------

export async function loadLibrary() {
  const since = localDate(subDays(new Date(), 6));
  const [entriesRes, logsRes, daysRes] = await Promise.all([
    supabase.from('entries')
      .select('id, status, favorite, genre, updated_at, work:works(id, title, author, cover_url, pages, genre, work_key)')
      .order('updated_at', { ascending: false }),
    supabase.from('logs')
      .select('id, rating, finished_on, created_at, work:works(work_key)')
      .order('finished_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('reading_days').select('entry_id, read_on, page_reached').gte('read_on', since),
  ]);
  const error = entriesRes.error || logsRes.error || daysRes.error;
  if (error) return { error };

  const latestLog = new Map(); // work_key -> jüngster eigener Durchgang
  for (const l of logsRes.data || []) {
    const k = l.work?.work_key;
    if (k && !latestLog.has(k)) latestLog.set(k, l);
  }
  const days = new Map(); // entry_id -> { 'yyyy-mm-dd': page|null }
  for (const d of daysRes.data || []) {
    if (!days.has(d.entry_id)) days.set(d.entry_id, {});
    days.get(d.entry_id)[d.read_on] = d.page_reached;
  }
  const items = (entriesRes.data || []).map((e) => ({
    ...e,
    log: latestLog.get(e.work?.work_key) || null,
    days: days.get(e.id) || {},
  }));
  return { items };
}

// ---------- Schreiben ----------

// Zuerst im eigenen Katalog suchen, erst dann ein neues Werk anlegen.
async function findOrCreateWork({ title, author, pages, genre }) {
  const key = workKey(title, author);
  const { data: found } = await supabase.from('works').select('id').eq('work_key', key).limit(1);
  if (found && found.length) return { id: found[0].id };
  const { data, error } = await supabase.from('works')
    .insert({ title: title.trim(), author: author?.trim() || null, pages: pages || null, genre: genre || null })
    .select('id').single();
  return error ? { error } : { id: data.id };
}

export async function addBook({ title, author, pages, genre, status, rating, finishedOn, review }) {
  const work = await findOrCreateWork({ title, author, pages, genre });
  if (work.error) return { error: work.error };
  const { data: entry, error } = await supabase.from('entries')
    .insert({ work_id: work.id, status, genre: genre || null }).select('id').single();
  if (error) {
    if (error.code === '23505') return { error: { message: 'This book is already in your library.' } };
    return { error };
  }
  if (status === 'read' && (rating || review || finishedOn)) {
    const res = await logRead({ workId: work.id, rating, finishedOn, review });
    if (res.error) return res;
  }
  return { id: entry.id };
}

export async function updateEntry(id, fields) {
  return supabase.from('entries').update(fields).eq('id', id);
}

export async function removeEntry(id) {
  return supabase.from('entries').delete().eq('id', id);
}

// Ein vollständig gelesener Durchgang (Teilweise Gelesenes = nur Notizen).
export async function logRead({ workId, rating, finishedOn, review, isReread = false }) {
  return supabase.from('logs').insert({
    work_id: workId,
    finished_on: finishedOn || localDate(),
    rating: rating || null,
    review: review?.trim() || null,
    is_reread: isReread,
  });
}

export async function setReadingDay(entryId, day, on) {
  if (on) return supabase.from('reading_days').insert({ entry_id: entryId, read_on: day });
  return supabase.from('reading_days').delete().eq('entry_id', entryId).eq('read_on', day);
}

export async function setPageReached(entryId, day, page) {
  return supabase.from('reading_days').update({ page_reached: page || null }).eq('entry_id', entryId).eq('read_on', day);
}

export function renderStars(rating) {
  if (!rating) return '';
  const r = Math.round(Number(rating) * 2) / 2;
  return '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '');
}
