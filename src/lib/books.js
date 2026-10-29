import { format, subDays } from 'date-fns';
import { supabase } from './supabase.js';

// Feste Genre-Liste: gespeichert werden die Schlüssel, angezeigt die Namen.
export const GENRES = [
  ['nonfiction', 'Nonfiction'], ['esoteric', 'Esoteric'], ['thriller', 'Thriller'],
  ['horror', 'Horror'], ['scifi', 'Sci-Fi'], ['fantasy', 'Fantasy'],
  ['literature', 'Literature'], ['children', "Children's"], ['hobby', 'Hobby'], ['other', 'Other'],
];
export const genreLabel = (key) => (GENRES.find(([k]) => k === key) || [null, ''])[1];

export const STATUSES = [['read', 'Read'], ['reading', 'Reading'], ['want', 'Readlist']];

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

// ---------- Genre automatisch bestimmen ----------
// Open Library liefert viele, oft ungenaue Themen. Jedes Thema zählt für das
// erste passende Genre; spezifische Genres gewinnen ab zwei Treffern (bei sehr
// wenigen Themen ab einem), sonst entscheidet Literatur gegen Sachbuch.
// An 20 bekannten Büchern geprüft (29.10.2026).
const GENRE_RULES = [
  ['horror', /\bhorror\b|ghost stor|vampire|zombie/],
  ['scifi', /science fiction|sci-fi|space opera|dystopia|time travel/],
  ['fantasy', /\bfantasy\b|fantastic fiction|dragons|wizards|\bmagic\b/],
  ['thriller', /thriller|suspense|detective|mystery|crime fiction|krimi/],
  ['children', /juvenile|children's|childrens|picture book|kinderbuch|bilderbuch|kinder- und jugend/],
  ['esoteric', /occult|esoteric|astrology|tarot|spirituality|new age|mysticism|meditation|chakra|reiki|manifestation|self-realization/],
  ['hobby', /cooking|recipes|cookery|gardening|crafts|handicraft|knitting|hobbies|\bsports\b|photography|baking/],
  ['nonfiction', /non-fiction|nonfiction|history|histoire|historia|science|philosophy|philosophie|psychology|biography|economics|politics|sociology|ontology|essays|cognition|reasoning|decision making|business|self-help/],
  ['literature', /\bfiction\b|\bnovels?\b|\broman\b|poetry|\bdrama\b|short stories|fictional works|classic literature/],
];
const SPECIFIC = ['horror', 'scifi', 'fantasy', 'thriller', 'esoteric', 'hobby'];
export function genreFromSubjects(subjects) {
  const subs = (subjects || []).map((x) => String(x).toLowerCase());
  if (!subs.length) return null;
  const count = {};
  for (const x of subs) {
    const hit = GENRE_RULES.find(([, re]) => re.test(x));
    if (hit) count[hit[0]] = (count[hit[0]] || 0) + 1;
  }
  const min = subs.length < 10 ? 1 : 2;
  let best = null;
  for (const k of SPECIFIC) if ((count[k] || 0) >= min && (!best || count[k] > count[best])) best = k;
  if (best) return best;
  if ((count.children || 0) >= min) return 'children';
  return (count.literature || 0) > (count.nonfiction || 0) ? 'literature' : 'nonfiction';
}

// Fragt Open Library nach Themen, Seitenzahl und Cover. Übernommen wird nur
// ein Treffer, dessen Titel und Autor zum eingegebenen Buch passen.
export async function lookupOpenLibrary(title, author) {
  try {
    const url = 'https://openlibrary.org/search.json?limit=5&fields=title,author_name,subject,number_of_pages_median,cover_i'
      + '&title=' + encodeURIComponent(title) + (author ? '&author=' + encodeURIComponent(author) : '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { docs = [] } = await res.json();
    const want = normalizeKey(title);
    const doc = docs.find((d) => {
      const t = normalizeKey(d.title);
      return t === want || t.startsWith(want + ' ') || want.startsWith(t + ' ');
    });
    if (!doc) return null;
    return {
      genre: genreFromSubjects(doc.subject),
      pages: doc.number_of_pages_median || null,
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    };
  } catch {
    return null; // Open Library nicht erreichbar: Buch trotzdem anlegen
  }
}

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
async function findOrCreateWork({ title, author, pages }) {
  const key = workKey(title, author);
  const { data: found } = await supabase.from('works').select('id').eq('work_key', key).limit(1);
  if (found && found.length) return { id: found[0].id };
  const ol = await lookupOpenLibrary(title, author);
  const { data, error } = await supabase.from('works')
    .insert({
      title: title.trim(),
      author: author?.trim() || null,
      pages: pages || ol?.pages || null,
      genre: ol?.genre || null,
      cover_url: ol?.cover_url || null,
    })
    .select('id').single();
  return error ? { error } : { id: data.id };
}

// Das Genre bestimmt die App; im Eintrag bleibt es leer = Genre des Werks.
export async function addBook({ title, author, pages, status, rating, finishedOn, review }) {
  const work = await findOrCreateWork({ title, author, pages });
  if (work.error) return { error: work.error };
  const { data: entry, error } = await supabase.from('entries')
    .insert({ work_id: work.id, status }).select('id').single();
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

// ---------- Profil ----------

export async function uploadAvatar(userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function loadMyQuotes() {
  return supabase.from('quotes')
    .select('id, page, body, created_at, work:works(title, author)')
    .order('created_at', { ascending: false });
}

export function renderStars(rating) {
  if (!rating) return '';
  const r = Math.round(Number(rating) * 2) / 2;
  return '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '');
}
