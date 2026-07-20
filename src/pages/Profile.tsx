import { useEffect, useState } from 'react';
import {
  fetchProfile, fetchUserMatches, updateProfileEfootballId,
  type SBMatch,
} from '../supabaseClient';
import { Check, Calendar, Activity, Gamepad2 } from 'lucide-react';

interface ProfileProps {
  currentUserId: string;
  userEmail: string;
  onProfileUpdate: (username: string, avatarUrl?: string) => void;
}

interface Match {
  id: string;
  winnerId: string;
  winnerUsername: string;
  loserId: string | null;
  loserUsername: string;
  winnerScore: number;
  loserScore: number;
  createdAt: string;
}

const toMatch = (r: SBMatch): Match => ({
  id:            r.id,
  winnerId:      r.winner_id,
  winnerUsername: r.winner_username,
  loserId:       r.loser_id,
  loserUsername: r.loser_username,
  winnerScore:   r.winner_score,
  loserScore:    r.loser_score,
  createdAt:     r.created_at,
});

export const Profile: React.FC<ProfileProps> = ({ currentUserId, userEmail, onProfileUpdate: _onProfileUpdate }) => {
  const [username, setUsername]   = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [efootballId, setEfootballId] = useState('');
  const [updating, setUpdating]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [updateMsg, setUpdateMsg] = useState('');
  const [matches, setMatches]     = useState<Match[]>([]);

  const [wins, setWins]               = useState(0);
  const [draws, setDraws]             = useState(0);
  const [losses, setLosses]           = useState(0);
  const [goalsScored, setGoalsScored] = useState(0);
  const [goalsConceded, setGoalsConceded] = useState(0);

  const goalDifference = goalsScored - goalsConceded;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profile, matchRows] = await Promise.all([
          fetchProfile(currentUserId),
          fetchUserMatches(currentUserId),
        ]);

        if (profile) {
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url || '');
          setEfootballId(profile.efootball_id || '');
        }

        const allMatches = matchRows.map(toMatch);
        setMatches(allMatches);

        let w = 0, d = 0, l = 0, gs = 0, gc = 0;
        allMatches.forEach(m => {
          const isDraw = m.winnerScore === m.loserScore;
          if (isDraw) {
            d++;
            if (m.winnerId === currentUserId) {
              gs += m.winnerScore;
              gc += m.loserScore;
            } else {
              gs += m.loserScore;
              gc += m.winnerScore;
            }
          } else if (m.winnerId === currentUserId) {
            w++;
            gs += m.winnerScore;
            gc += m.loserScore;
          } else {
            l++;
            gs += m.loserScore;
            gc += m.winnerScore;
          }
        });
        setWins(w);
        setDraws(d);
        setLosses(l);
        setGoalsScored(gs);
        setGoalsConceded(gc);
      } catch (err) {
        console.error('Profile error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUserId]);

  const handleUpdateEfootballId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (efootballId.trim().length < 2) { alert('eFootball ID must be at least 2 characters.'); return; }
    setUpdating(true);
    setUpdateMsg('');
    try {
      await updateProfileEfootballId(currentUserId, efootballId.trim());
      setUpdateMsg('eFootball ID saved!');
    } catch (err: any) {
      alert('Error saving eFootball ID: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const totalPlayed = wins + losses + draws;
  const winRate = totalPlayed > 0 ? ((wins / totalPlayed) * 100).toFixed(1) : '0';
  const gdDisplay = goalDifference > 0 ? `+${goalDifference}` : `${goalDifference}`;

  let userTitle = 'Benchwarmer 🪑';
  let titleColor = 'var(--text-muted)';
  if (totalPlayed >= 3) {
    const rate = parseFloat(winRate);
    if (rate >= 70) { userTitle = '🏆 eFootball Legend'; titleColor = '#FFD700'; }
    else if (rate >= 50) { userTitle = '⚽ Consistent Scorer'; titleColor = 'var(--accent)'; }
    else if (rate < 40) { userTitle = '🤡 Certified Chopo'; titleColor = '#EF4444'; }
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>Loading your Trophy Room…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Trophy Room &amp; Profile</h2>
        <p>Personal analytics, achievements, and account settings.</p>
      </div>

      {/* User Hero Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(169, 14, 2, 0.06) 0%, rgba(169, 14, 2, 0.02) 100%)', border: '1.5px solid rgba(169,14,2,0.15)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '28px', border: '2px solid rgba(169,14,2,0.3)', overflow: 'hidden', boxShadow: '0 0 15px rgba(169, 14, 2, 0.2)' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : username.substring(0, 2).toUpperCase()
          }
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{username}</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>{userEmail}</p>
          {efootballId && (
            <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Gamepad2 size={13} /> eFootball ID: {efootballId}
            </p>
          )}
          <div style={{ display: 'inline-flex', background: 'rgba(169,14,2,0.08)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(169,14,2,0.2)', fontSize: '13px', fontWeight: 'bold', color: titleColor }}>
            {userTitle}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Matches', value: totalPlayed, color: 'var(--text-primary)' },
          { label: 'Wins', value: wins, color: 'var(--success)' },
          { label: 'Draws', value: draws, color: 'var(--text-muted)' },
          { label: 'Losses', value: losses, color: 'var(--danger)' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'var(--accent)' },
          { label: 'Goal Diff', value: gdDisplay, color: goalDifference > 0 ? 'var(--success)' : goalDifference < 0 ? 'var(--danger)' : 'var(--text-muted)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
            <h2 style={{ fontSize: '30px', margin: '4px 0', color: stat.color }}>{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Edit + History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* eFootball Account */}
        <section className="card" style={{ alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Gamepad2 size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '18px' }}>eFootball Account</h3>
          </div>
          {updateMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: '#A7F3D0', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} /><span>{updateMsg}</span>
            </div>
          )}
          <form onSubmit={handleUpdateEfootballId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-efootball-id">eFootball In-Game Username</label>
              <input
                id="edit-efootball-id"
                type="text"
                className="form-input"
                value={efootballId}
                onChange={(e) => setEfootballId(e.target.value)}
                required
                placeholder="Your eFootball in-game ID"
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>This will be visible to everyone on your profile.</p>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={updating} style={{ fontSize: '14px', padding: '10px' }}>
              {updating ? 'Saving...' : 'Save eFootball ID'}
            </button>
          </form>
        </section>

        {/* Recent Battles */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '18px' }}>Recent Battles</h3>
          </div>
          {matches.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>No matches yet. Go win one!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matches.map(m => {
                const isDraw = m.winnerScore === m.loserScore;
                const isWin = !isDraw && m.winnerId === currentUserId;
                const opponent = isWin || (isDraw && m.winnerId === currentUserId) ? m.loserUsername : m.winnerUsername;
                const myScore = isWin || (isDraw && m.winnerId === currentUserId) ? m.winnerScore : m.loserScore;
                const opponentScore = isWin || (isDraw && m.winnerId === currentUserId) ? m.loserScore : m.winnerScore;
                const dateStr = m.createdAt
                  ? new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '';
                
                const badgeText = isDraw ? 'DRAW' : isWin ? 'WIN' : 'LOSS';
                const badgeBg = isDraw ? 'rgba(255, 251, 212, 0.05)' : isWin ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
                const badgeBorder = isDraw ? '1px solid var(--border-color)' : 'none';
                const badgeColor = isDraw ? 'var(--text-muted)' : isWin ? 'var(--success)' : 'var(--danger)';

                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: badgeBg, border: badgeBorder, color: badgeColor }}>
                          {badgeText}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Calendar size={10} /> {dateStr}
                        </span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>vs {opponent}</p>
                    </div>
                    <div style={{ fontSize: '16px', fontFamily: 'var(--font-display)', fontWeight: 'bold', color: isDraw ? 'var(--text-primary)' : 'var(--primary)' }}>
                      {myScore} - {opponentScore}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
