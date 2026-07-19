import { useState, useEffect } from 'react';
import {
  fetchMatchComments, insertMatchComment, fetchMatchReaction, fetchMatchReactionCounts,
  upsertMatchReaction, deleteMatchReaction, type SBMatch, type SBComment,
} from '../supabaseClient';
import { MessageSquare, ChevronDown, ChevronUp, Send, Flame, Award } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PostCardProps {
  match: SBMatch;
  currentUser: { uid: string; displayName: string; avatarUrl?: string } | null;
  onAuthRequired: () => void;
  onViewProfile: (uid: string) => void;
}

type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'wow';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like'  },
  { type: 'love', emoji: '❤️', label: 'Love'  },
  { type: 'haha', emoji: '😂', label: 'Haha'  },
  { type: 'wow',  emoji: '😮', label: 'Wow'   },
  { type: 'sad',  emoji: '😢', label: 'Sad'   },
];

// ─── Avatar component (shows photo if available, else initials) ───────────────
const Avatar: React.FC<{ name: string; photoUrl?: string | null; size?: number; onClick?: () => void }> = ({ name, photoUrl, size = 40, onClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const showPhoto = photoUrl && !imgErr;
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        border: '2px solid var(--border-color)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: showPhoto ? 'transparent' : 'var(--primary)',
        fontWeight: 700, fontSize: size * 0.38,
        color: '#FFFBD4', fontFamily: 'var(--font-display)',
        transition: 'opacity 0.2s',
      }}
    >
      {showPhoto
        ? <img src={photoUrl!} alt={name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.substring(0, 2).toUpperCase()
      }
    </div>
  );
};

// ─── PostCard ─────────────────────────────────────────────────────────────────
export const PostCard: React.FC<PostCardProps> = ({ match, currentUser, onAuthRequired, onViewProfile }) => {
  const [comments, setComments]           = useState<SBComment[]>([]);
  const [commentsOpen, setCommentsOpen]   = useState(false);
  const [commentText, setCommentText]     = useState('');
  const [posting, setPosting]             = useState(false);
  const [myReaction, setMyReaction]       = useState<ReactionType | null>(null);
  const [counts, setCounts]               = useState<Record<ReactionType, number>>({ like: 0, love: 0, haha: 0, sad: 0, wow: 0 });
  const [reactionBarOpen, setReactionBarOpen] = useState(false);

  // Winner's avatar: prefer joined profile data, fallback to initials
  const winnerAvatar = match.winner?.avatar_url ?? null;

  useEffect(() => {
    fetchMatchReactionCounts(match.id).then(res => {
      setCounts({ like: res.like||0, love: res.love||0, haha: res.haha||0, sad: res.sad||0, wow: res.wow||0 });
    });
    if (currentUser) {
      fetchMatchReaction(match.id, currentUser.uid).then(type => {
        if (type) setMyReaction(type as ReactionType);
      });
    }
  }, [match.id, currentUser]);

  useEffect(() => {
    if (!commentsOpen) return;
    fetchMatchComments(match.id).then(rows => {
      setComments(rows);
    });
  }, [commentsOpen, match.id]);

  const handleReact = async (type: ReactionType) => {
    if (!currentUser) { onAuthRequired(); return; }
    setReactionBarOpen(false);
    if (myReaction === type) {
      await deleteMatchReaction(match.id, currentUser.uid);
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setMyReaction(null);
    } else {
      if (myReaction) setCounts(prev => ({ ...prev, [myReaction]: Math.max(0, prev[myReaction] - 1) }));
      await upsertMatchReaction(match.id, currentUser.uid, type);
      setCounts(prev => ({ ...prev, [type]: (prev[type]||0) + 1 }));
      setMyReaction(type);
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) { onAuthRequired(); return; }
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    setCommentText('');
    try {
      await insertMatchComment({ match_id: match.id, user_id: currentUser.uid, content: text });
      const fresh = await fetchMatchComments(match.id);
      setComments(fresh);
    } catch (err: any) {
      alert('Could not comment: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((s, v) => s + v, 0);
  const myReactionData  = REACTIONS.find(r => r.type === myReaction);
  const dateLabel = new Date(match.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <article className="post-card" style={{ padding: '20px' }}>

      {/* Header */}
      <div className="post-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Avatar
          name={match.winner_username}
          photoUrl={winnerAvatar}
          size={44}
          onClick={() => onViewProfile(match.winner_id)}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onViewProfile(match.winner_id)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontWeight: 700, fontSize: '15px', color: 'var(--primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {match.winner_username}
            </button>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
              backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Award size={11} /> VICTORY
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dateLabel}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{
        background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Winner */}
          <div>
            <button
              onClick={() => onViewProfile(match.winner_id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '15px', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
            >
              {match.winner_username}
            </button>
            <div style={{ fontSize: '46px', fontWeight: 800, color: 'var(--success)', lineHeight: 1.1 }}>{match.winner_score}</div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Winner</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)', opacity: 0.4 }}>VS</div>
          {/* Loser */}
          <div>
            <button
              onClick={() => match.loser_id ? onViewProfile(match.loser_id) : undefined}
              style={{ background: 'none', border: 'none', padding: 0, cursor: match.loser_id ? 'pointer' : 'default', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {match.loser_username}
            </button>
            <div style={{ fontSize: '46px', fontWeight: 800, color: 'var(--danger)', lineHeight: 1.1 }}>{match.loser_score}</div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Opponent</span>
          </div>
        </div>
      </div>

      {/* Troll comment */}
      {match.troll_comment && (
        <div style={{
          background: 'rgba(169,14,2,0.05)', borderLeft: '3px solid var(--primary)',
          borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: '14px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <Flame size={15} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontStyle: 'italic', fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
            "{match.troll_comment}"
          </p>
        </div>
      )}

      {/* Screenshot */}
      {match.screenshot_url && (
        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
          <img
            src={match.screenshot_url}
            alt="Match screenshot"
            style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', background: '#0a0a0a', display: 'block' }}
          />
        </div>
      )}

      {/* Reaction summary */}
      {totalReactions > 0 && (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '10px' }}>
          {REACTIONS.filter(r => (counts[r.type]||0) > 0).map(r => (
            <span key={r.type} title={r.label} style={{ fontSize: '15px' }}>{r.emoji}</span>
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>{totalReactions}</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', paddingTop: '10px', gap: '4px' }}>
        {/* React button + picker */}
        <div style={{ flex: 1, position: 'relative' }} onMouseLeave={() => setReactionBarOpen(false)}>
          <button
            className={`action-btn${myReaction ? ' reacted' : ''}`}
            onMouseEnter={() => setReactionBarOpen(true)}
            onClick={() => {
              if (!currentUser) { onAuthRequired(); return; }
              if (myReaction) handleReact(myReaction);
              else setReactionBarOpen(o => !o);
            }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
          >
            {myReactionData ? myReactionData.emoji : '👍'}
            <span>{myReactionData ? myReactionData.label : 'Like'}</span>
          </button>
          {reactionBarOpen && (
            <div className="reaction-picker">
              {REACTIONS.map(r => (
                <button
                  key={r.type}
                  className={`reaction-btn${myReaction === r.type ? ' active' : ''}`}
                  onClick={() => handleReact(r.type)}
                  title={r.label}
                >
                  <span className="reaction-emoji">{r.emoji}</span>
                  <span className="reaction-label">{r.label}</span>
                  {(counts[r.type]||0) > 0 && <span className="reaction-mini-count">{counts[r.type]}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment toggle */}
        <button
          className="action-btn"
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
          onClick={() => setCommentsOpen(o => !o)}
        >
          <MessageSquare size={17} />
          <span>Comment</span>
          {commentsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Comments drawer */}
      {commentsOpen && (
        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '14px' }}>
          {comments.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
              No comments yet — drop some banter 🔥
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {comments.map(c => {
                const authorName = c.profiles?.username || `Player#${c.user_id.substring(0, 5)}`;
                const authorAvatar = c.profiles?.avatar_url ?? null;
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Avatar name={authorName} photoUrl={authorAvatar} size={30} onClick={() => onViewProfile(c.user_id)} />
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: '12px', flex: 1 }}>
                      <button
                        onClick={() => onViewProfile(c.user_id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: '12px', color: 'var(--primary)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '2px' }}
                      >
                        {authorName}
                      </button>
                      <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Avatar name={currentUser.displayName} photoUrl={currentUser.avatarUrl} size={30} />
              <input
                type="text"
                className="form-input"
                placeholder="Roast this victory/loss..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePostComment(); }}
                style={{ flex: 1, padding: '8px 14px', fontSize: '14px' }}
              />
              <button
                className="btn btn-primary"
                onClick={handlePostComment}
                disabled={posting || !commentText.trim()}
                style={{ padding: '8px 12px', minWidth: 'auto' }}
              >
                <Send size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthRequired}
              style={{ width: '100%', padding: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
            >
              🔒 Log in to comment
            </button>
          )}
        </div>
      )}
    </article>
  );
};
