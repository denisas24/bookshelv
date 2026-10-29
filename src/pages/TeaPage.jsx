import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { groupTeas, renderStars, showToast } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';

const HeartIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

function ReplyBox({ onSubmit, onCancel, placeholder = 'Add a comment…' }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const ok = await onSubmit(body);
    setBusy(false);
    if (ok) setText('');
  };
  return (
    <div className="reply-box">
      <textarea rows={2} value={text} placeholder={placeholder} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }} />
      <div className="reply-box-actions">
        {onCancel && <button className="link-btn muted" onClick={onCancel}>Cancel</button>}
        <button className="btn-primary btn-small" onClick={submit} disabled={busy || !text.trim()}>Post</button>
      </div>
    </div>
  );
}

function Post({ author, meta, body, stars, liked, likeCount, onLike, onReply, replyLabel = 'Reply', onDelete, children, small }) {
  return (
    <div className={`post${small ? ' post-small' : ''}`}>
      <Avatar profile={author} size={small ? 24 : 32} />
      <div className="post-body">
        <div className="post-head">
          <span className="post-author">{author?.display_name || 'Someone'}</span>
          {stars ? <span className="stars post-stars">{renderStars(stars)}</span> : null}
          <span className="post-meta">{meta}</span>
        </div>
        {body && <p className="post-text">{body}</p>}
        <div className="post-actions">
          <button className={`post-action${liked ? ' liked' : ''}`} onClick={onLike}>
            <HeartIcon filled={liked} /> {likeCount > 0 ? likeCount : ''}
          </button>
          {onReply && <button className="post-action" onClick={onReply}>{replyLabel}</button>}
          {onDelete && <button className="post-action" onClick={onDelete}>Delete</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TeaPage() {
  const { key: rawKey } = useParams();
  const key = decodeURIComponent(rawKey);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null); // { entryId }
  const [inWishlist, setInWishlist] = useState(false);

  const group = useMemo(() => groupTeas(entries).find(g => g.key === key), [entries, key]);

  const load = async () => {
    const [{ data: teas }, { data: prof }, { data: com }] = await Promise.all([
      supabase.from('tea_entries').select('*').limit(1000),
      supabase.from('profiles').select('*'),
      supabase.from('tea_comments').select('*').eq('tea_key', key).order('created_at', { ascending: true }),
    ]);
    const g = groupTeas(teas || []).find(x => x.key === key);
    const entryIds = g ? g.entries.map(e => e.id) : [];
    const commentIds = (com || []).map(c => c.id);
    const likeQueries = [];
    if (entryIds.length) likeQueries.push(supabase.from('tea_likes').select('*').in('entry_id', entryIds));
    if (commentIds.length) likeQueries.push(supabase.from('tea_likes').select('*').in('comment_id', commentIds));
    const likeResults = await Promise.all(likeQueries);
    setEntries(teas || []);
    setProfiles(prof || []);
    setComments(com || []);
    setLikes(likeResults.flatMap(r => r.data || []));
    if (g) {
      let wq = supabase.from('wishlist').select('id').eq('user_id', user.id).eq('tea_name', g.name);
      wq = g.brand ? wq.eq('tea_brand', g.brand) : wq.is('tea_brand', null);
      const { data: w } = await wq;
      setInWishlist((w || []).length > 0);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [key]);

  const profileOf = (id) => profiles.find(p => p.id === id);
  const likeInfo = (field, id) => {
    const list = likes.filter(l => l[field] === id);
    return { count: list.length, mine: list.find(l => l.user_id === user.id) };
  };

  const toggleLike = async (field, id) => {
    const { mine } = likeInfo(field, id);
    if (mine) {
      setLikes(prev => prev.filter(l => l.id !== mine.id));
      await supabase.from('tea_likes').delete().eq('id', mine.id);
    } else {
      const { data, error } = await supabase.from('tea_likes').insert({ user_id: user.id, [field]: id }).select().single();
      if (error) { showToast('Could not like.'); return; }
      setLikes(prev => [...prev, data]);
    }
  };

  const addComment = async ({ body, entry_id }) => {
    const { data, error } = await supabase.from('tea_comments')
      .insert({ tea_key: key, user_id: user.id, body, entry_id }).select().single();
    if (error) { showToast('Could not post.'); return false; }
    setComments(prev => [...prev, data]);
    setReplyTo(null);
    return true;
  };

  const deleteComment = async (id) => {
    await supabase.from('tea_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const addToWishlist = async () => {
    const firstOther = group.entries.find(e => e.user_id !== user.id) || group.entries[0];
    const { error } = await supabase.from('wishlist').insert({
      user_id: user.id,
      tea_name: group.name,
      tea_brand: group.brand || null,
      saved_from: profileOf(firstOther.user_id)?.display_name || null,
    });
    if (error && error.code !== '23505') { showToast('Could not save.'); return; }
    setInWishlist(true);
    showToast('Saved to wishlist.');
  };

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;
  if (!group) {
    return (
      <div className="empty-state">
        <p>This tea could not be found.</p>
        <button className="btn-ghost" onClick={() => navigate('/explore')}>Back to Explore</button>
      </div>
    );
  }

  const reviews = [...group.entries].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  const repliesTo = (field, id) => comments.filter(c => c[field] === id);
  const isMine = (uid) => uid === user.id;
  const ratedByMe = group.entries.some(e => isMine(e.user_id));
  const when = (d) => formatDistanceToNow(new Date(d), { addSuffix: true });

  const renderReplies = (list) => list.map(r => {
    const li = likeInfo('comment_id', r.id);
    return (
      <Post key={r.id} small author={profileOf(r.user_id)} meta={when(r.created_at)} body={r.body}
        liked={!!li.mine} likeCount={li.count} onLike={() => toggleLike('comment_id', r.id)}
        onDelete={isMine(r.user_id) ? () => deleteComment(r.id) : null} />
    );
  });

  return (
    <div className="tea-page">
      <button className="link-btn muted back-link" onClick={() => navigate('/explore')}>← Explore</button>

      <header className="tea-page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="tea-page-meta">
            {group.brand}{group.brand && group.category ? ' · ' : ''}<span style={{ textTransform: 'capitalize' }}>{group.category}</span>
          </p>
          <p className="tea-page-score">
            <span className="stars">{renderStars(Math.round(group.avg * 2) / 2)}</span>
            <span>{group.avg.toFixed(1)} · {group.entries.length} {group.entries.length === 1 ? 'rating' : 'ratings'}</span>
          </p>
        </div>
        {!ratedByMe && (
          <button className={inWishlist ? 'btn-ghost' : 'btn-primary'} onClick={addToWishlist} disabled={inWishlist}>
            {inWishlist ? 'On your wishlist' : '+ Wishlist'}
          </button>
        )}
      </header>

      <section className="tea-section">
        {reviews.length === 0 && <p className="tea-empty">No ratings yet.</p>}
        {reviews.map(e => {
          const li = likeInfo('entry_id', e.id);
          const replies = repliesTo('entry_id', e.id);
          return (
            <Post key={e.id} author={profileOf(e.user_id)} stars={e.rating}
              meta={e.date_tried ? format(new Date(e.date_tried), 'MMM d, yyyy') : when(e.created_at)}
              body={e.review} liked={!!li.mine} likeCount={li.count}
              onLike={() => toggleLike('entry_id', e.id)}
              onReply={() => setReplyTo(replyTo?.entryId === e.id ? null : { entryId: e.id })}
              replyLabel={replies.length ? `Comment (${replies.length})` : 'Comment'}>
              {replies.length > 0 && <div className="post-replies">{renderReplies(replies)}</div>}
              {replyTo?.entryId === e.id && (
                <ReplyBox onCancel={() => setReplyTo(null)} onSubmit={body => addComment({ body, entry_id: e.id })} />
              )}
            </Post>
          );
        })}
      </section>

    </div>
  );
}
