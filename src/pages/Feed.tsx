import { useEffect, useState } from 'react';
import { supabase, fetchAllMatches, type SBMatch } from '../supabaseClient';
import { PostCard } from '../components/PostCard';
import { ViewProfile, PlayerSearch } from './ViewProfile';
import { Search } from 'lucide-react';

interface FeedProps {
  currentUser: { uid: string; displayName: string; avatarUrl?: string } | null;
  onLoginRequest: () => void;
  feedKey?: number; // increment from parent to force a refresh
}

export const Feed: React.FC<FeedProps> = ({ currentUser, onLoginRequest, feedKey = 0 }) => {
  const [matches, setMatches]               = useState<SBMatch[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [viewProfileId, setViewProfileId]   = useState<string | null>(null);
  const [showSearch, setShowSearch]         = useState(false);

  // ─── Load / reload whenever feedKey changes ──────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchAllMatches()
      .then(rows => { setMatches(rows); setLoading(false); })
      .catch(err  => { console.error(err); setLoading(false); });
  }, [feedKey]);

  // ─── Supabase Realtime: append new matches instantly ─────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('public:matches:feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, payload => {
        const m = payload.new as SBMatch;
        setMatches(prev => (prev.some(x => x.id === m.id) ? prev : [m, ...prev]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAuthRequired = () => setShowAuthModal(true);
  const handleLogin        = () => { setShowAuthModal(false); onLoginRequest(); };

  // ─── Show single player profile ──────────────────────────────────────────────
  if (viewProfileId) {
    return <ViewProfile userId={viewProfileId} onBack={() => setViewProfileId(null)} />;
  }

  return (
    <div className="feed-container">
      {/* Header row */}
      <div className="feed-heading" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="feed-title">🏆 Goals Feed</h2>
          <p className="feed-subtitle">See match victories logged by players. React, comment and banter.</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowSearch(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '14px', whiteSpace: 'nowrap', alignSelf: 'center' }}
          title="Search for a player"
        >
          <Search size={16} /> Find Player
        </button>
      </div>

      {/* Feed list */}
      {loading ? (
        <div className="flex-center" style={{ minHeight: '45vh', flexDirection: 'column', gap: '20px' }}>
          <div className="football-loader" style={{ fontSize: '38px' }}>⚽</div>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            Loading victories…
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-feed">
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ marginBottom: '8px' }}>No matches yet</h3>
          <p>Go to <strong>Submit Score</strong> to log the first victory!</p>
        </div>
      ) : (
        <div className="posts-list">
          {matches.map(match => (
            <PostCard
              key={match.id}
              match={match}
              currentUser={currentUser}
              onAuthRequired={handleAuthRequired}
              onViewProfile={uid => setViewProfileId(uid)}
            />
          ))}
        </div>
      )}

      {/* Player search modal */}
      {showSearch && (
        <PlayerSearch
          onClose={() => setShowSearch(false)}
          onSelectUser={uid => { setShowSearch(false); setViewProfileId(uid); }}
        />
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Join the Banter</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              Log in to react and comment on victories.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowAuthModal(false)} style={{ padding: '10px 20px' }}>
                Keep browsing
              </button>
              <button className="btn btn-primary" onClick={handleLogin} style={{ padding: '10px 24px' }}>
                Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
