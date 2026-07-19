import React, { useState, useEffect } from 'react';
import { db } from '../firebaseClient';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
  setDoc, getDoc, increment, updateDoc,
} from 'firebase/firestore';
import {
  MessageSquare, ChevronDown, ChevronUp, Send,
  Trash2, ThumbsUp, Heart, Laugh, Frown, Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  imageUrl: string | null;
  category: string;
  createdAt: any;
  reactionCounts: { like: number; love: number; haha: number; sad: number; wow: number };
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: any;
}

interface PostCardProps {
  post: Post;
  currentUser: { uid: string; displayName: string } | null;
  onDelete: (postId: string) => void;
  onAuthRequired: () => void;
}

// ─── Reaction config ─────────────────────────────────────────────────────────
type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'wow';

const REACTIONS: { type: ReactionType; emoji: string; label: string; Icon: React.FC<any> }[] = [
  { type: 'like', emoji: '👍', label: 'Like',    Icon: ThumbsUp },
  { type: 'love', emoji: '❤️', label: 'Love',    Icon: Heart    },
  { type: 'haha', emoji: '😂', label: 'Haha',    Icon: Laugh    },
  { type: 'wow',  emoji: '😮', label: 'Wow',     Icon: Zap      },
  { type: 'sad',  emoji: '😢', label: 'Sad',     Icon: Frown    },
];

const CATEGORY_COLORS: Record<string, string> = {
  Announcement: 'rgba(169,14,2,0.85)',
  Question:     'rgba(59,130,246,0.85)',
  Discussion:   'rgba(16,185,129,0.85)',
  Achievement:  'rgba(234,179,8,0.85)',
  Other:        'rgba(107,114,128,0.85)',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; url: string | null; size?: number }> = ({ name, url, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    backgroundColor: 'var(--primary)', color: 'var(--text-dark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.35,
    border: '2px solid var(--border-color-glow)',
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : name.substring(0, 2).toUpperCase()
    }
  </div>
);

// ─── PostCard ─────────────────────────────────────────────────────────────────
export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onDelete, onAuthRequired }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [counts, setCounts] = useState(post.reactionCounts ?? { like: 0, love: 0, haha: 0, sad: 0, wow: 0 });
  const [reactionBarOpen, setReactionBarOpen] = useState(false);

  // Load my existing reaction
  useEffect(() => {
    if (!currentUser) return;
    const reactionRef = doc(db, 'posts', post.id, 'reactions', currentUser.uid);
    getDoc(reactionRef).then(snap => {
      if (snap.exists()) setMyReaction(snap.data().type as ReactionType);
    });
  }, [post.id, currentUser]);

  // Live comments subscription when expanded
  useEffect(() => {
    if (!commentsOpen) return;
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return () => unsub();
  }, [commentsOpen, post.id]);

  // ── React ──────────────────────────────────────────────────────────────────
  const handleReact = async (type: ReactionType) => {
    if (!currentUser) { onAuthRequired(); return; }
    setReactionBarOpen(false);

    const reactionRef = doc(db, 'posts', post.id, 'reactions', currentUser.uid);
    const postRef     = doc(db, 'posts', post.id);

    if (myReaction === type) {
      // Toggle off
      await deleteDoc(reactionRef);
      await updateDoc(postRef, { [`reactionCounts.${type}`]: increment(-1) });
      setCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] ?? 0) - 1) }));
      setMyReaction(null);
    } else {
      // Remove old reaction if any
      if (myReaction) {
        await updateDoc(postRef, { [`reactionCounts.${myReaction}`]: increment(-1) });
        setCounts(prev => ({ ...prev, [myReaction!]: Math.max(0, (prev[myReaction!] ?? 0) - 1) }));
      }
      // Add new
      await setDoc(reactionRef, { type });
      await updateDoc(postRef, { [`reactionCounts.${type}`]: increment(1) });
      setCounts(prev => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }));
      setMyReaction(type);
    }
  };

  // ── Comment ────────────────────────────────────────────────────────────────
  const handlePostComment = async () => {
    if (!currentUser) { onAuthRequired(); return; }
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId:   currentUser.uid,
        authorName: currentUser.displayName,
        content:    text,
        createdAt:  serverTimestamp(),
      });
      setCommentText('');
    } finally {
      setPosting(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((s, v) => s + v, 0);
  const myReactionData = REACTIONS.find(r => r.type === myReaction);
  const formattedDate  = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Just now';

  return (
    <article className="post-card">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="post-header">
        <Avatar name={post.authorName} url={post.authorAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="post-author">{post.authorName}</span>
            <span
              className="post-category"
              style={{ background: CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.Other }}
            >
              {post.category}
            </span>
          </div>
          <span className="post-date">{formattedDate}</span>
        </div>
        {currentUser?.uid === post.authorId && (
          <button
            className="icon-btn danger"
            onClick={() => onDelete(post.id)}
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="post-body">
        <p className="post-content">{post.content}</p>
        {post.imageUrl && (
          <div className="post-image-wrap">
            <img
              src={post.imageUrl}
              alt="Post attachment"
              className="post-image"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* ── Reaction summary ───────────────────────────────────────────────── */}
      {totalReactions > 0 && (
        <div className="reaction-summary">
          {REACTIONS.filter(r => (counts[r.type] ?? 0) > 0).map(r => (
            <span key={r.type}>{r.emoji}</span>
          ))}
          <span className="reaction-count">{totalReactions}</span>
        </div>
      )}

      {/* ── Action bar ─────────────────────────────────────────────────────── */}
      <div className="post-actions">

        {/* Like / Reaction picker */}
        <div className="reaction-wrap" onMouseLeave={() => setReactionBarOpen(false)}>
          <button
            className={`action-btn${myReaction ? ' reacted' : ''}`}
            onMouseEnter={() => setReactionBarOpen(true)}
            onClick={() => {
              if (!currentUser) { onAuthRequired(); return; }
              if (myReaction) handleReact(myReaction); // toggle off
              else handleReact('like');
            }}
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
                  {(counts[r.type] ?? 0) > 0 && (
                    <span className="reaction-mini-count">{counts[r.type]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment toggle */}
        <button
          className="action-btn"
          onClick={() => {
            if (!commentsOpen && !currentUser) {
              // Guests CAN read comments — just open them
            }
            setCommentsOpen(o => !o);
          }}
        >
          <MessageSquare size={18} />
          <span>
            {commentsOpen ? 'Hide' : 'Comment'}
            {comments.length > 0 || !commentsOpen ? '' : ''}
          </span>
          {commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Comments ───────────────────────────────────────────────────────── */}
      {commentsOpen && (
        <div className="comments-section">
          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="comments-empty">No comments yet. Be the first!</p>
          ) : (
            <div className="comments-list">
              {comments.map(c => (
                <div key={c.id} className="comment-item">
                  <Avatar name={c.authorName} url={null} size={32} />
                  <div className="comment-bubble">
                    <span className="comment-author">{c.authorName}</span>
                    <p className="comment-text">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          {currentUser ? (
            <div className="comment-input-row">
              <Avatar name={currentUser.displayName} url={null} size={32} />
              <input
                type="text"
                className="form-input comment-input"
                placeholder="Write a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePostComment(); }}
              />
              <button
                className="btn btn-primary icon-only"
                onClick={handlePostComment}
                disabled={posting || !commentText.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <button className="auth-prompt-btn" onClick={onAuthRequired}>
              🔒 Log in to comment
            </button>
          )}
        </div>
      )}
    </article>
  );
};
