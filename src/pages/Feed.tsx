import React, { useEffect, useState, useRef } from 'react';
import { supabase, fetchPosts, insertPost, deletePost, type SBPost } from '../supabaseClient';
import { Image, X, ChevronDown, Flame, Send } from 'lucide-react';
import { PostCard, type Post } from '../components/PostCard';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedProps {
  currentUser: { uid: string; displayName: string; avatarUrl?: string } | null;
  onLoginRequest: () => void;
}

const CATEGORIES = ['Announcement', 'Question', 'Discussion', 'Achievement', 'Other'] as const;

// Convert Supabase row → PostCard Post shape
const toPost = (r: SBPost): Post => ({
  id:            r.id,
  authorId:      r.author_id,
  authorName:    r.author_name,
  authorAvatar:  r.author_avatar,
  content:       r.content,
  imageUrl:      r.image_url,
  category:      r.category,
  createdAt:     { toDate: () => new Date(r.created_at) } as any,
  reactionCounts: { like: 0, love: 0, haha: 0, sad: 0, wow: 0 },
});

// ─── CreatePost ───────────────────────────────────────────────────────────────
const CreatePost: React.FC<{
  currentUser: { uid: string; displayName: string; avatarUrl?: string };
  onPosted: (post: Post) => void;
}> = ({ currentUser, onPosted }) => {
  const [content, setContent]         = useState('');
  const [imageUrl, setImageUrl]       = useState('');
  const [category, setCategory]       = useState<string>('Discussion');
  const [showExtras, setShowExtras]   = useState(false);
  const [posting, setPosting]         = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handlePost = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || posting) return;
    setPosting(true);

    // ⚡ Optimistic: clear form INSTANTLY
    const optimistic: Post = {
      id:            'temp-' + Date.now(),
      authorId:      currentUser.uid,
      authorName:    currentUser.displayName,
      authorAvatar:  currentUser.avatarUrl ?? null,
      content:       trimmedContent,
      imageUrl:      imageUrl.trim() || null,
      category,
      createdAt:     { toDate: () => new Date() } as any,
      reactionCounts: { like: 0, love: 0, haha: 0, sad: 0, wow: 0 },
    };
    setContent('');
    setImageUrl('');
    setCategory('Discussion');
    setShowExtras(false);
    onPosted(optimistic);

    try {
      await insertPost({
        author_id:    currentUser.uid,
        author_name:  currentUser.displayName,
        author_avatar: currentUser.avatarUrl ?? null,
        content:      trimmedContent,
        image_url:    imageUrl.trim() || null,
        category,
      });
    } catch (err: any) {
      alert('Could not post: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="create-post-card">
      <div className="create-post-top">
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          backgroundColor: 'var(--primary)', color: 'var(--text-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, border: '2px solid var(--border-color-glow)',
          overflow: 'hidden',
        }}>
          {currentUser.avatarUrl
            ? <img src={currentUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : currentUser.displayName.substring(0, 2).toUpperCase()
          }
        </div>

        <textarea
          ref={textareaRef}
          className="create-post-textarea"
          placeholder={`What's on your mind, ${currentUser.displayName.split(' ')[0]}?`}
          value={content}
          rows={1}
          onChange={e => { setContent(e.target.value); autoResize(); }}
          onFocus={() => setShowExtras(true)}
        />
      </div>

      {showExtras && (
        <div className="create-post-extras">
          <div className="select-wrap">
            <select
              className="form-input category-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>

          <div className="image-url-wrap">
            <Image size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="url"
              className="form-input"
              placeholder="Image URL (optional)"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
            />
            {imageUrl && (
              <button onClick={() => setImageUrl('')} className="icon-btn" style={{ flexShrink: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="create-post-actions">
            <button
              className="btn"
              style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '13px', padding: '8px 14px' }}
              onClick={() => { setShowExtras(false); setContent(''); setImageUrl(''); }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePost}
              disabled={posting || !content.trim()}
              style={{ padding: '10px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={15} />
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AuthBanner ───────────────────────────────────────────────────────────────
const AuthBanner: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="auth-banner">
    <Flame size={20} style={{ flexShrink: 0 }} />
    <span>Log in to <strong>post, react</strong> and <strong>comment</strong> on the Goals feed.</span>
    <button className="btn btn-primary" onClick={onLogin} style={{ padding: '8px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}>
      Log In
    </button>
  </div>
);

// ─── AuthPromptModal ──────────────────────────────────────────────────────────
const AuthPromptModal: React.FC<{ onClose: () => void; onLogin: () => void }> = ({ onClose, onLogin }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
      <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Join the conversation</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
        You need to be logged in to react, comment, or post on the Goals feed.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={onClose} style={{ padding: '10px 20px' }}>
          Continue browsing
        </button>
        <button className="btn btn-primary" onClick={onLogin} style={{ padding: '10px 24px' }}>
          Log In
        </button>
      </div>
    </div>
  </div>
);

// ─── Feed ─────────────────────────────────────────────────────────────────────
export const Feed: React.FC<FeedProps> = ({ currentUser, onLoginRequest }) => {
  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initial load
  useEffect(() => {
    fetchPosts()
      .then(rows => setPosts(rows.map(toPost)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ⚡ Supabase real-time subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const newPost = toPost(payload.new as SBPost);
        setPosts(prev => {
          // skip if it was our own optimistic post
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, payload => {
        setPosts(prev => prev.filter(p => p.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    // Optimistic
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await deletePost(postId);
    } catch (err: any) {
      alert('Could not delete: ' + err.message);
    }
  };

  const handleNewPost = (post: Post) => {
    setPosts(prev => [post, ...prev.filter(p => !p.id.startsWith('temp-'))]);
  };

  const handleAuthRequired = () => setShowAuthModal(true);
  const handleLogin = () => { setShowAuthModal(false); onLoginRequest(); };

  return (
    <div className="feed-container">
      <div className="feed-heading">
        <h2 className="feed-title">🔥 Goals Feed</h2>
        <p className="feed-subtitle">Stay up to date with match achievements, banter, and highlights.</p>
      </div>

      {!currentUser && <AuthBanner onLogin={handleLogin} />}

      {currentUser && (
        <CreatePost currentUser={currentUser} onPosted={handleNewPost} />
      )}

      {loading ? (
        <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '20px' }}>
          <div className="football-loader" style={{ fontSize: '38px' }}>⚽</div>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            Loading feed…
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-feed">
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ marginBottom: '8px' }}>Nothing here yet</h3>
          <p>Be the first to post something on the Goals feed!</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onDelete={handleDelete}
              onAuthRequired={handleAuthRequired}
            />
          ))}
        </div>
      )}

      {showAuthModal && (
        <AuthPromptModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />
      )}
    </div>
  );
};
