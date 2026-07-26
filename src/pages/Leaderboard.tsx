import React, { useEffect, useState } from 'react';
import { fetchAllMatches, fetchAllProfiles, type SBMatch, type SBProfile } from '../supabaseClient';
import { Crown, ShieldAlert, Award, Frown, Users, Calendar, History } from 'lucide-react';
import { HeadToHead } from '../components/HeadToHead';

interface PlayerStats {
  id: string;
  username: string;
  avatar_url: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalPlayed: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
}

// Helper to format YYYY-MM key to Month Name Year (e.g. "2026-07" -> "July 2026")
const formatMonthKey = (key: string): string => {
  if (key === 'all') return 'All-Time Records';
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// Helper to get current YYYY-MM key
const getCurrentMonthKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const Leaderboard: React.FC<{ onViewProfile?: (userId: string) => void }> = ({ onViewProfile }) => {
  const [profiles, setProfiles] = useState<SBProfile[]>([]);
  const [matches, setMatches]   = useState<SBMatch[]>([]);
  const [loading, setLoading]   = useState(true);

  const [activeTab, setActiveTab] = useState<'fame' | 'shame' | 'h2h'>('fame');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [profData, matchData] = await Promise.all([
          fetchAllProfiles(),
          fetchAllMatches(),
        ]);

        setProfiles(profData);
        setMatches(matchData);

        // Extract all unique YYYY-MM keys from matches
        const monthKeysSet = new Set<string>();
        monthKeysSet.add(getCurrentMonthKey()); // Always include current month

        matchData.forEach(m => {
          if (m.created_at) {
            const d = new Date(m.created_at);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, '0');
              monthKeysSet.add(`${y}-${mo}`);
            }
          }
        });

        // Sort months descending (newest first)
        const sortedMonths = Array.from(monthKeysSet).sort((a, b) => b.localeCompare(a));
        setAvailableMonths(sortedMonths);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute stats filtered by selected month
  const currentMonthKey = getCurrentMonthKey();


  const filteredMatches = selectedMonth === 'all'
    ? matches
    : matches.filter(m => {
        if (!m.created_at) return false;
        const d = new Date(m.created_at);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${mo}` === selectedMonth;
      });

  const statsMap: { [id: string]: PlayerStats } = {};
  profiles.forEach(p => {
    statsMap[p.id] = { id: p.id, username: p.username, avatar_url: p.avatar_url ?? null, wins: 0, draws: 0, losses: 0, totalPlayed: 0, winRate: 0, goalsScored: 0, goalsConceded: 0 };
  });

  filteredMatches.forEach(m => {
    const isDraw = m.winner_score === m.loser_score;

    if (statsMap[m.winner_id]) {
      statsMap[m.winner_id].totalPlayed++;
      statsMap[m.winner_id].goalsScored  += m.winner_score;
      statsMap[m.winner_id].goalsConceded += m.loser_score;
      if (isDraw) {
        statsMap[m.winner_id].draws++;
      } else {
        statsMap[m.winner_id].wins++;
      }
    }
    if (m.loser_id && statsMap[m.loser_id]) {
      statsMap[m.loser_id].totalPlayed++;
      statsMap[m.loser_id].goalsScored   += m.loser_score;
      statsMap[m.loser_id].goalsConceded += m.winner_score;
      if (isDraw) {
        statsMap[m.loser_id].draws++;
      } else {
        statsMap[m.loser_id].losses++;
      }
    }
  });

  const statsList = Object.values(statsMap).map(p => ({
    ...p,
    winRate: p.totalPlayed > 0 ? parseFloat(((p.wins / p.totalPlayed) * 100).toFixed(1)) : 0,
  }));

  const activePlayers = statsList.filter(p => p.totalPlayed > 0);
  const hallOfFame = [...activePlayers].sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  const wallOfShame = [...activePlayers].sort((a, b) => b.losses - a.losses || a.wins - b.wins);
  const currentList = activeTab === 'fame' ? hallOfFame : wallOfShame;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>
          Tallying monthly wins and losses…
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header & Month Selector */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h2 className="primary-heading" style={{ fontSize: '34px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: '2px', color: 'var(--text-primary)' }}>
            Leaderboards
          </h2>
          <p className="secondary-text" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Glorify the winners. Clown the losers.
          </p>
        </div>

        {/* Month Selector Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <select
            className="input-field"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
              backgroundColor: '#FFFFFF', border: '1.5px solid var(--border-color)',
              color: '#1A1A1A', cursor: 'pointer', outline: 'none', minWidth: '180px',
            }}
          >
            <option value={currentMonthKey}>
              📅 Current Month ({formatMonthKey(currentMonthKey)})
            </option>
            {availableMonths.filter(m => m !== currentMonthKey).map(m => (
              <option key={m} value={m}>
                📜 {formatMonthKey(m)}
              </option>
            ))}
            <option value="all">🏆 All-Time Records</option>
          </select>
        </div>
      </div>


      {/* Tab Switcher */}
      <div style={{
        display: 'flex', background: '#F8F9FA', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '6px', marginBottom: '28px', gap: '6px'
      }}>
        <button
          onClick={() => setActiveTab('fame')}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '8px',
            backgroundColor: activeTab === 'fame' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'fame' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', transition: 'var(--transition)'
          }}
        >
          <Crown size={18} style={{ color: activeTab === 'fame' ? '#FFD700' : 'inherit' }} />
          <span>Hall of Fame</span>
        </button>
        <button
          onClick={() => setActiveTab('shame')}
          style={{
            flex: 1, padding: '12px', borderRadius: '8px',
            backgroundColor: activeTab === 'shame' ? '#881337' : 'transparent',
            color: activeTab === 'shame' ? '#FECDD3' : 'var(--text-muted)',
            fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', transition: 'var(--transition)',
            border: activeTab === 'shame' ? '1px solid rgba(225, 29, 72, 0.4)' : 'none'
          }}
        >
          <ShieldAlert size={18} style={{ color: activeTab === 'shame' ? '#FDA4AF' : 'inherit' }} />
          <span>Wall of Shame</span>
        </button>
        <button
          onClick={() => setActiveTab('h2h')}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '8px',
            backgroundColor: activeTab === 'h2h' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'h2h' ? '#FFFFFF' : 'var(--text-muted)',
            fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', transition: 'var(--transition)'
          }}
        >
          <Users size={18} />
          <span>Head to Head</span>
        </button>
      </div>

      {activeTab === 'h2h' ? (
        <HeadToHead />
      ) : activePlayers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: '16px' }}>
          <History size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
            No Matches Played in {formatMonthKey(selectedMonth)}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Submit scores in this period to populate the Hall of Fame and Wall of Shame!
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {activeTab === 'fame' ? (
                <>
                  <Award size={24} style={{ color: '#EAB308' }} />
                  <div>
                    <h3 className="primary-heading" style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Champions Standing ({formatMonthKey(selectedMonth)})
                    </h3>
                    <p className="secondary-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ranked by total victories and win rate.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Frown size={24} style={{ color: '#E11D48' }} />
                  <div>
                    <h3 className="primary-heading" style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: '#9F1239', letterSpacing: '-0.02em' }}>
                      Biggest Losers ({formatMonthKey(selectedMonth)})
                    </h3>
                    <p className="secondary-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ranked by total defeats.
                    </p>
                  </div>
                </>
              )}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {filteredMatches.length} Matches Tally
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
                  {['Rank', 'Player', 'P', 'W', 'D', 'L', 'WR%', 'GD'].map(h => (
                    <th key={h} style={{
                      padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      textAlign: h === 'Rank' || h === 'Player' ? 'left' : 'center'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentList.map((player, index) => {
                  const isTop = index === 0;
                  const gd = player.goalsScored - player.goalsConceded;
                  const gdLabel = gd > 0 ? `+${gd}` : `${gd}`;
                  return (
                    <tr
                      key={player.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isTop ? (activeTab === 'fame' ? 'rgba(234, 179, 8, 0.08)' : 'rgba(225, 29, 72, 0.06)') : 'transparent',
                        transition: 'var(--transition)'
                      }}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                        {isTop
                          ? (activeTab === 'fame' ? <span>👑 <span style={{ color: '#D97706' }}>1st</span></span> : <span>🤡 <span style={{ color: '#E11D48' }}>1st</span></span>)
                          : `${index + 1}`}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: 'var(--primary)', color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '12px', border: isTop ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            overflow: 'hidden', flexShrink: 0,
                          }}>
                            {player.avatar_url
                              ? <img src={player.avatar_url} alt={player.username} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : player.username.substring(0, 2).toUpperCase()
                            }
                          </div>
                          <div>
                            <span
                              onClick={() => onViewProfile && onViewProfile(player.id)}
                              style={{
                                fontWeight: 700, color: isTop ? (activeTab === 'fame' ? '#92400E' : '#9F1239') : 'var(--text-primary)',
                                cursor: onViewProfile ? 'pointer' : 'default',
                                textDecoration: onViewProfile ? 'underline' : 'none',
                                textUnderlineOffset: '3px'
                              }}
                            >
                              {player.username}
                            </span>
                            {isTop && activeTab === 'shame' && (
                              <span style={{ fontSize: '10px', display: 'block', color: '#E11D48', fontWeight: 600 }}>
                                (KING OF NOOBS 🤡)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 500, color: 'var(--text-primary)' }}>{player.totalPlayed}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', color: '#16A34A', fontWeight: 700 }}>{player.wins}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', color: '#CA8A04', fontWeight: 600 }}>{player.draws}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', color: '#DC2626', fontWeight: 700 }}>{player.losses}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{player.winRate}%</td>
                      <td style={{
                        padding: '14px 20px', textAlign: 'center', fontWeight: 700,
                        color: gd > 0 ? '#16A34A' : gd < 0 ? '#DC2626' : 'var(--text-muted)'
                      }}>
                        {gdLabel}
                      </td>
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
