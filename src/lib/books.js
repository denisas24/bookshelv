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

// Fragt Open Library nach Themen, Seitenzahl und Cover. Gesucht wird über alle
// Ausgaben, damit auch deutsche Titel gefunden werden (z. B. „Welten“ als
// Ausgabe von „Transition“). Übernommen wird ein Treffer nur, wenn der Titel
// des Werks oder einer Ausgabe passt und – falls angegeben – der Autor.
const sameTitle = (a, b) => a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ');
function authorMatches(names, author) {
  if (!author) return true;
  const want = normalizeAuthor(author).split(' ').filter((w) => w.length > 1);
  return (names || []).some((n) => {
    const have = normalizeAuthor(n).split(' ');
    return want.filter((w) => have.includes(w)).length >= Math.min(1, want.length);
  });
}
const coverUrl = (id) => (id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null);

async function genreFromAuthor(author) {
  try {
    const res = await fetch('https://openlibrary.org/search.json?limit=3&fields=subject&author=' + encodeURIComponent(author));
    if (!res.ok) return null;
    const { docs = [] } = await res.json();
    return genreFromSubjects(docs.flatMap((x) => x.subject || []));
  } catch { return null; }
}

// Nachname zum Sortieren: „Kafka, Franz“ → kafka; „Ursula K. Le Guin“ → le guin;
// „Johann Wolfgang von Goethe“ → goethe (von/van/zu zählen nicht, wie im Deutschen üblich).
const KEEP = new Set(['le', 'la', 'de', 'du', 'di', 'da', 'del']);
export function surnameKey(author) {
  const a = (author || '').trim();
  if (!a) return '\uffff';
  if (a.includes(',')) return baseNorm(a.split(',')[0].replace(/^(von|van|zu|vom)\s+/i, ''));
  const parts = a.split(/\s+/);
  let i = parts.length - 1;
  while (i > 0 && KEEP.has(parts[i - 1].toLowerCase())) i -= 1;
  return baseNorm(parts.slice(i).join(' ') + ' ' + parts.slice(0, i).join(' '));
}

export async function lookupOpenLibrary(title, author) {
  try {
    const url = 'https://openlibrary.org/search.json?limit=8'
      + '&fields=key,title,author_name,subject,number_of_pages_median,cover_i,editions,editions.key,editions.title,editions.cover_i,editions.number_of_pages'
      + '&q=' + encodeURIComponent(`${title} ${author || ''}`.trim());
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { docs = [] } = await res.json();
    const want = normalizeKey(title);
    for (const d of docs) {
      if (!authorMatches(d.author_name, author)) continue;
      const ed = (d.editions?.docs || []).find((e) => sameTitle(normalizeKey(e.title), want));
      if (!ed && !sameTitle(normalizeKey(d.title), want)) continue;
      // Ohne Themen (oft bei rein deutschen Ausgaben) zählen die Themen der
      // bekanntesten Werke derselben Person, z. B. Riggs → Fantasy.
      const genre = genreFromSubjects(d.subject) || (author ? await genreFromAuthor(author) : null);
      return {
        genre,
        pages: ed?.number_of_pages || d.number_of_pages_median || null,
        cover_url: coverUrl(ed?.cover_i) || coverUrl(d.cover_i),
      };
    }
    return null;
  } catch {
    return null; // Open Library nicht erreichbar: Buch trotzdem anlegen
  }
}

// Ergänzt bei eigenen Werken fehlendes Cover, Genre oder Seitenzahl.
// Die Leseregel erlaubt Änderungen nur dem Ersteller; bei fremden Werken
// schlägt das still fehl, und das ist in Ordnung.
export async function enrichWork(work) {
  if (!work || (work.cover_url && work.genre && work.pages)) return null;
  const ol = await lookupOpenLibrary(work.title, work.author);
  if (!ol) return null;
  const patch = {};
  if (!work.cover_url && ol.cover_url) patch.cover_url = ol.cover_url;
  if (!work.genre && ol.genre) patch.genre = ol.genre;
  if (!work.pages && ol.pages) patch.pages = ol.pages;
  if (!Object.keys(patch).length) return null;
  const { error } = await supabase.from('works').update(patch).eq('id', work.id);
  return error ? null : patch;
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

// Für bis zu fünf Bücher ohne Cover/Genre Open Library befragen (im Hintergrund).
export async function enrichMissing(items) {
  const todo = items.map((i) => i.work).filter((w) => w && (!w.cover_url || !w.genre)).slice(0, 5);
  const out = {};
  for (const w of todo) {
    const patch = await enrichWork(w);
    if (patch) out[w.id] = patch;
  }
  return out;
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

export async function updateLog(id, { rating, finishedOn, review }) {
  return supabase.from('logs').update({
    rating: rating || null,
    finished_on: finishedOn,
    review: review?.trim() || null,
  }).eq('id', id);
}
export const deleteLog = (id) => supabase.from('logs').delete().eq('id', id);

export async function setReadingDay(entryId, day, on) {
  if (on) return supabase.from('reading_days').insert({ entry_id: entryId, read_on: day });
  return supabase.from('reading_days').delete().eq('entry_id', entryId).eq('read_on', day);
}

export async function setPageReached(entryId, day, page) {
  return supabase.from('reading_days').update({ page_reached: page || null }).eq('entry_id', entryId).eq('read_on', day);
}

// ---------- Buchseite ----------

export async function loadBook(entryId, myId) {
  const { data: entry, error } = await supabase.from('entries')
    .select('id, status, favorite, genre, created_at, work:works(id, title, author, cover_url, pages, genre, work_key, published_year)')
    .eq('id', entryId).single();
  if (error) return { error };
  const key = entry.work.work_key;
  const [days, logs, quotes, notes, pub] = await Promise.all([
    supabase.from('reading_days').select('read_on, page_reached').eq('entry_id', entryId).order('read_on'),
    supabase.from('logs').select('id, started_on, finished_on, rating, review, is_reread, created_at, work:works!inner(work_key)')
      .eq('work.work_key', key).order('finished_on', { ascending: false }),
    supabase.from('quotes').select('id, page, body, created_at, work:works!inner(work_key), saves:quote_saves(thought, user_id)')
      .eq('work.work_key', key).eq('user_id', myId).order('page', { ascending: true, nullsFirst: false }),
    supabase.from('notes').select('id, page, body, created_at, work:works!inner(work_key)')
      .eq('work.work_key', key).order('page', { ascending: true, nullsFirst: true }),
    supabase.from('public_logs').select('id, user_id, rating, review, is_reread, posted_at').eq('work_key', key)
      .order('posted_at', { ascending: false }),
  ]);
  const err = days.error || logs.error || quotes.error || notes.error || pub.error;
  if (err) return { error: err };

  // Durchschnitt: je Person zählt die jüngste Bewertung.
  const latest = new Map();
  for (const l of pub.data || []) if (l.rating && !latest.has(l.user_id)) latest.set(l.user_id, Number(l.rating));
  const ratings = [...latest.values()];
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const others = (pub.data || []).filter((l) => l.user_id !== myId && (l.review || l.rating));
  let people = {};
  if (others.length) {
    const ids = [...new Set(others.map((o) => o.user_id))];
    const { data: profs } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids);
    people = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }
  return {
    entry,
    days: Object.fromEntries((days.data || []).map((d) => [d.read_on, d.page_reached])),
    logs: logs.data || [],
    quotes: (quotes.data || []).map((q) => ({ ...q, thought: (q.saves || []).find((x) => x.user_id === myId)?.thought || '' })),
    notes: notes.data || [],
    others: others.map((o) => ({ ...o, profile: people[o.user_id] || null })),
    avg, ratingCount: ratings.length,
  };
}

export async function addQuote({ workId, page, body, thought }) {
  const { data, error } = await supabase.from('quotes')
    .insert({ work_id: workId, page: page || null, body: body.trim() }).select('id').single();
  if (error) return { error };
  if (thought?.trim()) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('quote_saves').update({ thought: thought.trim() }).eq('quote_id', data.id).eq('user_id', u.user.id);
  }
  return { id: data.id };
}
export const deleteQuote = (id) => supabase.from('quotes').delete().eq('id', id);

export async function addNote({ workId, page, body }) {
  return supabase.from('notes').insert({ work_id: workId, page: page || null, body: body.trim() });
}
export const deleteNote = (id) => supabase.from('notes').delete().eq('id', id);

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
