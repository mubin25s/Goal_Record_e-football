import React, { useEffect, useState } from 'react';
import { db } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { Crown, ShieldAlert, Award, Frown } from 'lucide-react';

interface PlayerStats {
  id: string;
  username: string;
  wins: number;
  losses: number;
  totalPlayed: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
}

export const Leaderboard: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fame' | 'shame'>('fame');

  useEffect(() => {
    const calcStats = async () => {
      setLoading(true);
      try {
        const [usersSnap, matchesSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'matches')),
        ]);

        const statsMap: { [id: string]: PlayerStats } = {};
        usersSnap.docs.forEach(d => {
          statsMap[d.id] = { id: d.id, username: (d.data() as any).username, wins: 0, losses: 0, totalPlayed: 0, winRate: 0, goalsScored: 0, goalsConceded: 0 };
        });

        matchesSnap.docs.forEach(d => {
          const m = d.data() as any;
          if (statsMap[m.winnerId]) {
            statsMap[m.winnerId].wins++;
            statsMap[m.winnerId].totalPlayed++;
            statsMap[m.winnerId].goalsScored += m.winnerScore;
            statsMap[m.winnerId].goalsConceded += m.loserScore;
          }
          if (m.loserId && statsMap[m.loserId]) {
            statsMap[m.loserId].losses++;
            statsMap[m.loserId].totalPlayed++;
            statsMap[m.loserId].goalsScored += m.loserScore;
            statsMap[m.loserId].goalsConceded += m.winnerScore;
          }
        });

        const list = Object.values(statsMap).map(p => ({
          ...p,
          winRate: p.totalPlayed > 0 ? parseFloat(((p.wins / p.totalPlayed) * 100).toFixed(1)) : 0,
        }));
        setStats(list);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    calcStats();
  }, []);

  const activePlayers = stats.filter(p => p.totalPlayed > 0);
  const hallOfFame = [...activePlayers].sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  const wallOfShame = [...activePlayers].sort((a, b) => b.losses - a.losses || a.wins - b.wins);
  const currentList = activeTab === 'fame' ? hallOfFame : wallOfShame;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>Tallying wins and losses…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Leaderboards</h2>
        <p>Glorify the winners. Clown the losers.</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', background: 'rgba(255, 251, 212, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px', marginBottom: '32px' }}>
        <button
          onClick={() => setActiveTab('fame')}
          style={{ flex: 1, padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: activeTab === 'fame' ? 'var(--primary)' : 'transparent', color: activeTab === 'fame' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold', fontFamily: 'var(--font-display)', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'var(--transition)' }}
        >
          <Crown size={18} style={{ color: activeTab === 'fame' ? '#FFD700' : 'inherit' }} />
          <span>Hall of Fame</span>
        </button>
        <button
          onClick={() => setActiveTab('shame')}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', backgroundColor: activeTab === 'shame' ? '#4A0400' : 'transparent', color: activeTab === 'shame' ? '#FFC7C4' : 'var(--text-muted)', fontWeight: 'bold', fontFamily: 'var(--font-display)', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'var(--transition)', border: activeTab === 'shame' ? '1px solid rgba(239, 68, 68, 0.4)' : 'none' }}
        >
          <ShieldAlert size={18} style={{ color: activeTab === 'shame' ? '#EF4444' : 'inherit' }} />
          <span>Wall of Shame</span>
        </button>
      </div>

      {activePlayers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>No match data yet. Submit matches to generate standings!</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'fame' ? (
              <><Award size={24} style={{ color: '#FFD700' }} /><div><h3 style={{ fontSize: '20px', color: 'var(--text-white)' }}>Champions Standing</h3><p style={{ fontSize: '12px' }}>Sorted by victories.</p></div></>
            ) : (
              <><Frown size={24} style={{ color: '#EF4444' }} /><div><h3 style={{ fontSize: '20px', color: '#FFC7C4' }}>Biggest Losers</h3><p style={{ fontSize: '12px' }}>The absolute chopos of the group.</p></div></>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 251, 212, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Rank', 'Player', 'P', 'W', 'L', 'WR%', 'GD'].map(h => (
                    <th key={h} style={{ padding: '16px 20px', color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase', textAlign: h === 'Rank' || h === 'Player' ? 'left' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentList.map((player, index) => {
                  const isTop = index === 0;
                  const gd = player.goalsScored - player.goalsConceded;
                  const gdLabel = gd > 0 ? `+${gd}` : `${gd}`;
                  return (
                    <tr key={player.id} style={{ borderBottom: '1px solid var(--border-color)', background: isTop ? (activeTab === 'fame' ? 'rgba(169, 14, 2, 0.08)' : 'rgba(239, 68, 68, 0.05)') : 'transparent', transition: 'var(--transition)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', fontSize: '16px' }}>
                        {isTop
                          ? (activeTab === 'fame' ? <span>👑 <span style={{ color: 'gold' }}>1st</span></span> : <span>🤡 <span style={{ color: '#EF4444' }}>1st</span></span>)
                          : `${index + 1}`}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', border: isTop ? '1.5px solid var(--accent)' : '1px solid var(--border-color)' }}>
                            {player.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: isTop ? (activeTab === 'fame' ? 'var(--accent)' : '#FFA7A7') : 'var(--text-white)' }}>{player.username}</span>
                            {isTop && activeTab === 'shame' && <span style={{ fontSize: '10px', display: 'block', color: '#FFA7A7', fontWeight: 500 }}>(KING OF NOOBS 🤡)</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 500 }}>{player.totalPlayed}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{player.wins}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>{player.losses}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 'bold' }}>{player.winRate}%</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: gd > 0 ? 'var(--success)' : gd < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{gdLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
