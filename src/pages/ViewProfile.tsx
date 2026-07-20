import { useEffect, useState } from 'react';
import { fetchUserMatches, fetchAllProfiles, type SBMatch, type SBProfile } from '../supabaseClient';
import { Calendar, Activity, Trophy, X, ChevronLeft } from 'lucide-react';

interface ViewProfileProps {
  userId: string;
  onBack: () => void;
}

interface Match {
  id: string;
  winnerId: string;
  winnerUsername: string;
  loserUsername: string;
  winnerScore: number;
  loserScore: number;
  createdAt: string;
}

export const ViewProfile: React.FC<ViewProfileProps> = ({ userId, onBack }) => {
  const [profile, setProfile] = useState<SBProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profiles, matchRows] = await Promise.all([
          fetchAllProfiles(),
          fetchUserMatches(userId),
        ]);
        const found = profiles.find(p => p.id === userId) || null;
        setProfile(found);
        setMatches(matchRows.map((m: SBMatch) => ({
          id:            m.id,
          winnerId:      m.winner_id,
          winnerUsername: m.winner_username,
          loserUsername: m.loser_username,
          winnerScore:   m.winner_score,
          loserScore:    m.loser_score,
          createdAt:     m.created_at,
        })));
      } catch (err) {
        console.error('ViewProfile error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const wins = matches.filter(m => m.winnerId === userId && m.winnerScore > m.loserScore).length;
  const draws = matches.filter(m => m.winnerScore === m.loserScore).length;
  const losses = matches.filter(m => m.winnerId !== userId && m.winnerScore > m.loserScore).length;
  const winRate = matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : '0';

  let title = 'Benchwarmer 🪑', titleColor = 'var(--text-muted)';
  if (matches.length >= 3) {
    const r = parseFloat(winRate);
    if (r >= 70) { title = '🏆 eFootball Legend'; titleColor = '#FFD700'; }
    else if (r >= 50) { title = '⚽ Consistent Scorer'; titleColor = 'var(--primary)'; }
    else if (r < 40) { title = '🤡 Certified Chopo'; titleColor = '#EF4444'; }
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Loading player…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>🕵️</div>
        <h3 style={{ marginBottom: '8px' }}>Player not found</h3>
        <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '20px' }}>← Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="btn"
        style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '14px', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <ChevronLeft size={16} /> Back to Feed
      </button>

      {/* Hero Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(169,14,2,0.05) 0%, rgba(169,14,2,0.01) 100%)', border: '1.5px solid rgba(169,14,2,0.15)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '28px', border: '2px solid rgba(169,14,2,0.3)', overflow: 'hidden', boxShadow: '0 0 15px rgba(169,14,2,0.2)' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : profile.username.substring(0, 2).toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '26px', marginBottom: '4px' }}>{profile.username}</h2>
          <div style={{ display: 'inline-flex', background: 'rgba(169,14,2,0.08)', padding: '5px 14px', borderRadius: '20px', border: '1px solid rgba(169,14,2,0.15)', fontSize: '13px', fontWeight: 'bold', color: titleColor }}>
            {title}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Played', value: matches.length, color: 'var(--text-white)' },
          { label: 'Wins',   value: wins,   color: 'var(--success)' },
          { label: 'Draws',  value: draws,  color: 'var(--text-muted)' },
          { label: 'Losses', value: losses, color: 'var(--danger)'  },
          { label: 'Win Rate', value: `${winRate}%`, color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{s.label}</p>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Match History */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '17px' }}>Match History</h3>
        </div>
        {matches.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No matches played yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {matches.map(m => {
              const isDraw = m.winnerScore === m.loserScore;
              const isWin = !isDraw && m.winnerId === userId;
              const opponent = isWin || (isDraw && m.winnerId === userId) ? m.loserUsername : m.winnerUsername;
              const myScore = isWin || (isDraw && m.winnerId === userId) ? m.winnerScore : m.loserScore;
              const theirScore = isWin || (isDraw && m.winnerId === userId) ? m.loserScore : m.winnerScore;
              const date = new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              
              const badgeText = isDraw ? 'DRAW' : isWin ? 'WIN' : 'LOSS';
              const badgeBg = isDraw ? 'rgba(255, 251, 212, 0.05)' : isWin ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
              const badgeBorder = isDraw ? '1px solid var(--border-color)' : 'none';
              const badgeColor = isDraw ? 'var(--text-muted)' : isWin ? 'var(--success)' : 'var(--danger)';

              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px', backgroundColor: badgeBg, border: badgeBorder, color: badgeColor }}>
                        {badgeText}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={10} /> {date}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>vs {opponent}</p>
                  </div>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 800, color: isDraw ? 'var(--text-primary)' : isWin ? 'var(--success)' : 'var(--danger)' }}>
                    {myScore} – {theirScore}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PlayerSearch modal ────────────────────────────────────────────────────────
interface PlayerSearchProps {
  onClose: () => void;
  onSelectUser: (uid: string) => void;
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({ onClose, onSelectUser }) => {
  const [query, setQuery]     = useState('');
  const [players, setPlayers] = useState<SBProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllProfiles()
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p =>
    p.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px' }}>🔍 Find a Player</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <input
            autoFocus
            type="text"
            className="form-input"
            placeholder="Search by username…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No players found.</p>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelectUser(p.id); onClose(); }}
                style={{ width: '100%', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(169,14,2,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0, overflow: 'hidden' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p.username.substring(0, 2).toUpperCase()
                  }
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>{p.username}</p>
                  {p.email && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{p.email}</p>}
                </div>
                <Trophy size={14} style={{ marginLeft: 'auto', color: 'var(--primary)', opacity: 0.5 }} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
