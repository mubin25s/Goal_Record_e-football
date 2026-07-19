import { useEffect, useState } from 'react';
import { supabase, fetchAllMatches, type SBMatch } from '../supabaseClient';
import { PostCard } from '../components/PostCard';

interface FeedProps {
  currentUser: { uid: string; displayName: string; avatarUrl?: string } | null;
  onLoginRequest: () => void;
  onViewProfile: (uid: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ currentUser, onLoginRequest, onViewProfile }) => {
  const [matches, setMatches]           = useState<SBMatch[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load matches on start
  useEffect(() => {
    fetchAllMatches()
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ⚡ Supabase real-time: re-fetch full list (with joins) on new match
  useEffect(() => {
    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        // Re-fetch with joins so avatar_url etc. are included
        fetchAllMatches().then(setMatches).catch(console.error);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAuthRequired = () => setShowAuthModal(true);
  const handleLogin = () => { setShowAuthModal(false); onLoginRequest(); };

  return (
    <div className="feed-container">
      <div className="feed-heading">
        <h2 className="feed-title">🏆 Goals Feed</h2>
        <p className="feed-subtitle">See matches logged by players in real-time, react with emojis, and banter in comments.</p>
      </div>

      {loading ? (
        <div className="flex-center" style={{ minHeight: '45vh', flexDirection: 'column', gap: '20px' }}>
          <div className="football-loader" style={{ fontSize: '38px' }}>⚽</div>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            Tuning Goals Feed…
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-feed">
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ marginBottom: '8px' }}>No matches recorded yet</h3>
          <p>Go to <strong>Submit Score</strong> and log a victory to post it here!</p>
        </div>
      ) : (
        <div className="posts-list">
          {matches.map(match => (
            <PostCard
              key={match.id}
              match={match}
              currentUser={currentUser}
              onAuthRequired={handleAuthRequired}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}

      {/* Auth prompt modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Join the Banter</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              You need to be logged in to react or comment on eFootball victories.
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
