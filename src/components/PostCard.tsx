import { useState, useEffect } from 'react';
import {
  fetchMatchComments, insertMatchComment, fetchMatchReaction, fetchMatchReactionCounts,
  upsertMatchReaction, deleteMatchReaction, fetchAllProfiles, fetchProfile, type SBMatch, type SBComment,
} from '../supabaseClient';
import {
  MessageSquare, ChevronDown, ChevronUp, Send,
  ThumbsUp, Heart, Laugh, Frown, Zap, Award, Flame,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
}

interface PostCardProps {
  match: SBMatch;
  currentUser: { uid: string; displayName: string; avatarUrl?: string } | null;
  onAuthRequired: () => void;
  onViewProfile: (uid: string) => void;
}

type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'wow';

const REACTIONS: { type: ReactionType; emoji: string; label: string; Icon: React.FC<any> }[] = [
  { type: 'like', emoji: '👍', label: 'Like',    Icon: ThumbsUp },
  { type: 'love', emoji: '❤️', label: 'Love',    Icon: Heart    },
  { type: 'haha', emoji: '😂', label: 'Haha',    Icon: Laugh    },
  { type: 'wow',  emoji: '😮', label: 'Wow',     Icon: Zap      },
  { type: 'sad',  emoji: '😢', label: 'Sad',     Icon: Frown    },
];

// Simple initial avatar
const Avatar: React.FC<{ name: string; avatarUrl?: string | null; size?: number }> = ({ name, avatarUrl, size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    backgroundColor: 'var(--primary)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.38,
    border: '1.5px solid var(--border-color)',
    fontFamily: 'var(--font-display)',
    overflow: 'hidden'
  }}>
    {avatarUrl ? (
      <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      name.substring(0, 2).toUpperCase()
    )}
  </div>
);

export const PostCard: React.FC<PostCardProps> = ({ match, currentUser, onAuthRequired, onViewProfile }) => {
  const [comments, setComments]           = useState<Comment[]>([]);
  const [commentsOpen, setCommentsOpen]   = useState(false);
  const [commentText, setCommentText]     = useState('');
  const [posting, setPosting]             = useState(false);
  const [myReaction, setMyReaction]       = useState<ReactionType | null>(null);
  const [counts, setCounts]               = useState<Record<ReactionType, number>>({ like: 0, love: 0, haha: 0, sad: 0, wow: 0 });
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [winnerAvatar, setWinnerAvatar]   = useState<string | null>(null);

  useEffect(() => {
    fetchProfile(match.winner_id).then(p => {
      if (p?.avatar_url) setWinnerAvatar(p.avatar_url);
    });
  }, [match.winner_id]);

  // Load reactions on load
  useEffect(() => {
    fetchMatchReactionCounts(match.id).then(res => {
      setCounts({
        like: res.like || 0,
        love: res.love || 0,
        haha: res.haha || 0,
        sad: res.sad || 0,
        wow: res.wow || 0,
      });
    });
    if (currentUser) {
      fetchMatchReaction(match.id, currentUser.uid).then(type => {
        if (type) setMyReaction(type as ReactionType);
      });
    }
  }, [match.id, currentUser]);

  // Load comments when comments area is opened
  useEffect(() => {
    if (!commentsOpen) return;
    Promise.all([
      fetchMatchComments(match.id),
      fetchAllProfiles()
    ]).then(([rows, profiles]) => {
      setComments(rows.map((r: SBComment) => {
        const p = profiles.find(pr => pr.id === r.user_id);
        const name = p ? p.username : (r.user_id === currentUser?.uid ? currentUser.displayName : `Player (${r.user_id.substring(0, 5)})`);
        return {
          id:        r.id,
          authorId:  r.user_id,
          authorName: name,
          authorAvatar: p ? p.avatar_url : (r.user_id === currentUser?.uid ? currentUser.avatarUrl : null),
          content:   r.content,
          createdAt: r.created_at,
        };
      }));
    });
  }, [commentsOpen, match.id, currentUser]);

  const handleReact = async (type: ReactionType) => {
    if (!currentUser) { onAuthRequired(); return; }
    setReactionBarOpen(false);

    if (myReaction === type) {
      await deleteMatchReaction(match.id, currentUser.uid);
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setMyReaction(null);
    } else {
      if (myReaction) {
        setCounts(prev => ({ ...prev, [myReaction]: Math.max(0, prev[myReaction] - 1) }));
      }
      await upsertMatchReaction(match.id, currentUser.uid, type);
      setCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
      setMyReaction(type);
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) { onAuthRequired(); return; }
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);

    const optimistic: Comment = {
      id:        'temp-' + Date.now(),
      authorId:  currentUser.uid,
      authorName: currentUser.displayName,
      content:   text,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    setCommentText('');

    try {
      await insertMatchComment({
        match_id: match.id,
        user_id:  currentUser.uid,
        content:  text,
      });
      // Refresh comments to get usernames and server timestamps
      const [fresh, profiles] = await Promise.all([
        fetchMatchComments(match.id),
        fetchAllProfiles()
      ]);
      setComments(fresh.map((r: SBComment) => {
        const p = profiles.find(pr => pr.id === r.user_id);
        const name = p ? p.username : (r.user_id === currentUser?.uid ? currentUser.displayName : `Player (${r.user_id.substring(0, 5)})`);
        return {
          id:        r.id,
          authorId:  r.user_id,
          authorName: name,
          authorAvatar: p ? p.avatar_url : (r.user_id === currentUser?.uid ? currentUser.avatarUrl : null),
          content:   r.content,
          createdAt: r.created_at,
        };
      }));
    } catch (err: any) {
      alert('Could not comment: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((s, v) => s + v, 0);
  const myReactionData = REACTIONS.find(r => r.type === myReaction);
  const dateLabel = new Date(match.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <article className="post-card" style={{ padding: '20px' }}>
      
      {/* Header Info */}
      <div className="post-header" style={{ marginBottom: '16px' }}>
        <Avatar name={match.winner_username} avatarUrl={winnerAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onViewProfile(match.winner_id)}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}
            >
              {match.winner_username}
            </button>
            {match.winner_score === match.loser_score ? (
              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 251, 212, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🤝 DRAW
              </span>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award size={12} /> VICTORY
              </span>
            )}
          </div>
          <span className="post-date">{dateLabel}</span>
        </div>
      </div>

      {/* Scoreboard Block */}
      <div className="scoreboard-container" style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <div className="score-matchup-row" style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Winner Card */}
          <div className="score-team-card">
            <button onClick={() => onViewProfile(match.winner_id)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'16px', color:'var(--accent)', padding:0 }}>{match.winner_username}</button>
            <div style={{ fontSize: '42px', fontWeight: 800, color: match.winner_score === match.loser_score ? 'var(--text-primary)' : 'var(--success)', margin: '4px 0' }}>{match.winner_score}</div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{match.winner_score === match.loser_score ? 'Draw' : 'Winner'}</span>
          </div>

          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-muted)', opacity: 0.5 }}>VS</div>

          {/* Loser Card */}
          <div className="score-team-card">
            <button onClick={() => match.loser_id && onViewProfile(match.loser_id)} style={{ background:'none', border:'none', cursor: match.loser_id ? 'pointer' : 'default', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'16px', color:'var(--text-primary)', padding:0 }}>{match.loser_username}</button>
            <div style={{ fontSize: '42px', fontWeight: 800, color: match.winner_score === match.loser_score ? 'var(--text-primary)' : 'var(--danger)', margin: '4px 0' }}>{match.loser_score}</div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{match.winner_score === match.loser_score ? 'Draw' : 'Opponent'}</span>
          </div>
        </div>
      </div>

      {/* Roast Balloon / Troll comment */}
      {match.troll_comment && (
        <div className="roast-quote-balloon" style={{
          background: 'rgba(169, 14, 2, 0.05)',
          borderLeft: '4px solid var(--primary)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <Flame size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
            "{match.troll_comment}"
          </p>
        </div>
      )}

      {/* Screen Evidence Upload */}
      {match.screenshot_url && (
        <div className="post-image-wrap" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <img
            src={match.screenshot_url}
            alt="Match Scoreboard Evidence"
            style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', background: '#0a0a0a', display: 'block' }}
          />
        </div>
      )}

      {/* Reactions Summary */}
      {totalReactions > 0 && (
        <div className="reaction-summary" style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '12px' }}>
          {REACTIONS.filter(r => (counts[r.type] || 0) > 0).map(r => (
            <span key={r.type} title={r.label} style={{ fontSize: '14px' }}>{r.emoji}</span>
          ))}
          <span className="reaction-count" style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>{totalReactions}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="post-actions" style={{ display: 'flex', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
        {/* React Button */}
        <div className="reaction-wrap" style={{ flex: 1 }} onMouseLeave={() => setReactionBarOpen(false)}>
          <button
            className={`action-btn${myReaction ? ' reacted' : ''}`}
            onMouseEnter={() => setReactionBarOpen(true)}
            onClick={() => {
              if (!currentUser) { onAuthRequired(); return; }
              if (myReaction) handleReact(myReaction);
              else handleReact('like');
            }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
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
                  {(counts[r.type] || 0) > 0 && (
                    <span className="reaction-mini-count">{counts[r.type]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment Toggle */}
        <button
          className="action-btn"
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          onClick={() => setCommentsOpen(o => !o)}
        >
          <MessageSquare size={18} />
          <span>Comment</span>
          {commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div className="comments-section" style={{ borderTop: '1.5px solid var(--border-color)', marginTop: '14px', paddingTop: '14px' }}>
          {comments.length === 0 ? (
            <p className="comments-empty" style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              No comments yet. Write some banter!
            </p>
          ) : (
            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {comments.map(c => (
                <div key={c.id} className="comment-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Avatar name={c.authorName} avatarUrl={c.authorAvatar} size={30} />
                  <div className="comment-bubble" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '12px', flex: 1 }}>
                    <span className="comment-author" style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--accent)', marginBottom: '3px' }}>
                      {c.authorName}
                    </span>
                    <p className="comment-text" style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Input */}
          {currentUser ? (
            <div className="comment-input-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Avatar name={currentUser.displayName} avatarUrl={currentUser.avatarUrl} size={30} />
              <input
                type="text"
                className="form-input comment-input"
                placeholder="Roast this victory/loss..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePostComment(); }}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary icon-only"
                onClick={handlePostComment}
                disabled={posting || !commentText.trim()}
                style={{ padding: '10px' }}
              >
                <Send size={15} />
              </button>
            </div>
          ) : (
            <button className="auth-prompt-btn" onClick={onAuthRequired} style={{ width: '100%', padding: '12px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>
              🔒 Log in to comment
            </button>
          )}
        </div>
      )}
    </article>
  );
};
