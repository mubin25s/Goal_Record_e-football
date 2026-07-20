import React, { useState, useEffect } from 'react';
import { fetchAllProfiles, fetchAllMatches, type SBProfile, type SBMatch } from '../supabaseClient';
import { Calendar, X } from 'lucide-react';

export const HeadToHead: React.FC = () => {
  const [profiles, setProfiles] = useState<SBProfile[]>([]);
  const [matches, setMatches] = useState<SBMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [playerAId, setPlayerAId] = useState<string>('');
  const [playerBId, setPlayerBId] = useState<string>('');

  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pRows, mRows] = await Promise.all([
          fetchAllProfiles(),
          fetchAllMatches(),
        ]);
        setProfiles(pRows);
        setMatches(mRows);
      } catch (err) {
        console.error('HeadToHead data load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const playerA = profiles.find(p => p.id === playerAId);
  const playerB = profiles.find(p => p.id === playerBId);

  // Filter matches between player A and player B
  const headToHeadMatches = matches.filter(m => {
    if (!playerAId || !playerBId) return false;
    return (
      (m.winner_id === playerAId && m.loser_id === playerBId) ||
      (m.winner_id === playerBId && m.loser_id === playerAId)
    );
  });

  // Calculate statistics
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let aGoals = 0;
  let bGoals = 0;

  headToHeadMatches.forEach(m => {
    const isDraw = m.winner_score === m.loser_score;
    if (isDraw) {
      draws++;
      aGoals += m.winner_score; // in a draw, both scored same amount
      bGoals += m.winner_score;
    } else if (m.winner_id === playerAId) {
      aWins++;
      aGoals += m.winner_score;
      bGoals += m.loser_score;
    } else {
      bWins++;
      bGoals += m.winner_score;
      aGoals += m.loser_score;
    }
  });

  const totalPlayed = headToHeadMatches.length;
  const aWinRate = totalPlayed > 0 ? ((aWins / totalPlayed) * 100).toFixed(1) : '0';
  const bWinRate = totalPlayed > 0 ? ((bWins / totalPlayed) * 100).toFixed(1) : '0';
  const aGD = aGoals - bGoals;
  const bGD = bGoals - aGoals;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
          Analyzing historical battles…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Selection Panel */}
      <div className="card" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'space-between', padding: '16px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Player One</label>
          <select
            className="form-input"
            value={playerAId}
            onChange={e => {
              const val = e.target.value;
              setPlayerAId(val);
              if (val === playerBId) {
                // Swap or clear to prevent self-comparison
                const alternative = profiles.find(p => p.id !== val);
                setPlayerBId(alternative?.id || '');
              }
            }}
            style={{ width: '100%', appearance: 'auto', backgroundColor: 'var(--bg-input)', fontSize: '14px', padding: '8px 4px' }}
          >
            <option value="">-- Select Player --</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '30px', paddingTop: '20px', flexShrink: 0 }}>
          VS
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Player Two</label>
          <select
            className="form-input"
            value={playerBId}
            onChange={e => {
              const val = e.target.value;
              setPlayerBId(val);
              if (val === playerAId) {
                // Swap or clear to prevent self-comparison
                const alternative = profiles.find(p => p.id !== val);
                setPlayerAId(alternative?.id || '');
              }
            }}
            style={{ width: '100%', appearance: 'auto', backgroundColor: 'var(--bg-input)', fontSize: '14px', padding: '8px 4px' }}
          >
            <option value="">-- Select Player --</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === playerAId}>{p.username}</option>
            ))}
          </select>
        </div>
      </div>

      {!playerA || !playerB ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please select two different players to view Head-to-Head stats.</p>
        </div>
      ) : (
        <>
          {/* Matchup Hero Board */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(169, 14, 2, 0.05) 0%, rgba(169, 14, 2, 0.01) 100%)',
            border: '1.5px solid rgba(169, 14, 2, 0.15)',
            padding: '16px 8px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '4px', width: '100%' }}>
              
              {/* Player A Side */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', border: '2px solid rgba(169, 14, 2, 0.3)', overflow: 'hidden', marginBottom: '8px', boxShadow: '0 0 15px rgba(169,14,2,0.15)' }}>
                  {playerA.avatar_url ? (
                    <>
                      <img 
                        src={playerA.avatar_url} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        {playerA.username.substring(0, 2).toUpperCase()}
                      </div>
                    </>
                  ) : (
                    playerA.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <h3 style={{ fontSize: '13px', color: 'var(--text-white)', marginBottom: '4px', wordBreak: 'break-word', lineHeight: 1.1 }}>{playerA.username}</h3>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', background: 'rgba(169,14,2,0.06)', padding: '2px 6px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                  WR {aWinRate}%
                </span>
              </div>

              {/* Central VS Record */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                  Head to Head
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-white)', display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                  <span>{aWins}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>W</span>
                  <span style={{ color: 'var(--border-color)', margin: '0 2px' }}>-</span>
                  <span>{draws}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>D</span>
                  <span style={{ color: 'var(--border-color)', margin: '0 2px' }}>-</span>
                  <span>{bWins}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>L</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {totalPlayed} {totalPlayed === 1 ? 'Match' : 'Matches'}
                </div>
              </div>

              {/* Player B Side */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', border: '2px solid rgba(169, 14, 2, 0.3)', overflow: 'hidden', marginBottom: '8px', boxShadow: '0 0 15px rgba(169,14,2,0.15)' }}>
                  {playerB.avatar_url ? (
                    <>
                      <img 
                        src={playerB.avatar_url} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        {playerB.username.substring(0, 2).toUpperCase()}
                      </div>
                    </>
                  ) : (
                    playerB.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <h3 style={{ fontSize: '13px', color: 'var(--text-white)', marginBottom: '4px', wordBreak: 'break-word', lineHeight: 1.1 }}>{playerB.username}</h3>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', background: 'rgba(169,14,2,0.06)', padding: '2px 6px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                  WR {bWinRate}%
                </span>
              </div>

            </div>
          </div>

          {totalPlayed === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No battles recorded yet</h3>
              <p>These two players haven't faced each other on the pitch. Go log a match to start the rivalry!</p>
            </div>
          ) : (
            <>
              {/* Detailed Performance Comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '28px 24px' }} className="card">
                <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', color: 'var(--text-white)' }}>
                  Matchup Analytics
                </h3>
                
                {[
                  {
                    label: 'Wins Matchup',
                    valA: `${aWins} W`,
                    valB: `${bWins} W`,
                    pctA: totalPlayed > 0 ? (aWins / totalPlayed) * 100 : 50,
                    pctB: totalPlayed > 0 ? (bWins / totalPlayed) * 100 : 50,
                    pctDraw: totalPlayed > 0 ? (draws / totalPlayed) * 100 : 0,
                    colorA: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgb(16, 185, 129))',
                    colorB: 'linear-gradient(90deg, rgb(239, 68, 68), rgba(239, 68, 68, 0.7))',
                    shadowA: '0 0 8px rgba(16, 185, 129, 0.4)',
                    shadowB: '0 0 8px rgba(239, 68, 68, 0.4)',
                    isWins: true,
                  },
                  {
                    label: 'Goals Scored',
                    valA: `${aGoals} G`,
                    valB: `${bGoals} G`,
                    pctA: (aGoals + bGoals) > 0 ? (aGoals / (aGoals + bGoals)) * 100 : 50,
                    pctB: (aGoals + bGoals) > 0 ? (bGoals / (aGoals + bGoals)) * 100 : 50,
                    colorA: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgb(16, 185, 129))',
                    colorB: 'linear-gradient(90deg, rgb(239, 68, 68), rgba(239, 68, 68, 0.7))',
                    shadowA: '0 0 8px rgba(16, 185, 129, 0.4)',
                    shadowB: '0 0 8px rgba(239, 68, 68, 0.4)',
                  },
                  {
                    label: 'Goal Difference',
                    valA: aGD > 0 ? `+${aGD}` : aGD,
                    valB: bGD > 0 ? `+${bGD}` : bGD,
                    pctA: (aGoals + bGoals) > 0 ? (aGoals / (aGoals + bGoals)) * 100 : 50,
                    pctB: (aGoals + bGoals) > 0 ? (bGoals / (aGoals + bGoals)) * 100 : 50,
                    colorA: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgb(16, 185, 129))',
                    colorB: 'linear-gradient(90deg, rgb(239, 68, 68), rgba(239, 68, 68, 0.7))',
                    shadowA: '0 0 8px rgba(16, 185, 129, 0.4)',
                    shadowB: '0 0 8px rgba(239, 68, 68, 0.4)',
                  },
                  {
                    label: 'Win Rate',
                    valA: `${aWinRate}%`,
                    valB: `${bWinRate}%`,
                    pctA: parseFloat(aWinRate) + parseFloat(bWinRate) > 0 ? (parseFloat(aWinRate) / (parseFloat(aWinRate) + parseFloat(bWinRate))) * 100 : 50,
                    pctB: parseFloat(aWinRate) + parseFloat(bWinRate) > 0 ? (parseFloat(bWinRate) / (parseFloat(aWinRate) + parseFloat(bWinRate))) * 100 : 50,
                    colorA: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgb(16, 185, 129))',
                    colorB: 'linear-gradient(90deg, rgb(239, 68, 68), rgba(239, 68, 68, 0.7))',
                    shadowA: '0 0 8px rgba(16, 185, 129, 0.4)',
                    shadowB: '0 0 8px rgba(239, 68, 68, 0.4)',
                  }
                ].map((m, idx) => {
                  const stripedOverlay = 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 0px, rgba(255, 255, 255, 0.15) 8px, transparent 8px, transparent 16px)';
                  
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      {/* Label & Values Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Player A Value */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-white)' }}>
                            {m.valA}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {playerA.username}
                          </span>
                        </div>

                        {/* Central Metric Name */}
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', textAlign: 'center', background: 'rgba(0,0,0,0.02)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          {m.label}
                        </span>

                        {/* Player B Value */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-white)' }}>
                            {m.valB}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {playerB.username}
                          </span>
                        </div>
                      </div>

                      {/* Comparison Bar */}
                      <div style={{
                        position: 'relative',
                        height: '14px',
                        borderRadius: '99px',
                        background: 'rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}>
                        {m.isWins ? (
                          <>
                            {m.pctDraw > 0 && m.pctA === 0 && m.pctB === 0 ? (
                              <div style={{
                                width: '100%',
                                backgroundColor: 'rgba(255, 251, 212, 0.15)',
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} title="Draws" />
                            ) : (
                              <>
                                {m.pctA > 0 && (
                                  <div style={{
                                    width: `${m.pctA}%`,
                                    background: `${stripedOverlay}, ${m.colorA}`,
                                    borderRadius: m.pctB === 0 && m.pctDraw === 0 ? '99px' : '99px 0 0 99px',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: m.shadowA
                                  }} />
                                )}
                                {m.pctDraw > 0 && (
                                  <div style={{
                                    width: `${m.pctDraw}%`,
                                    backgroundColor: 'rgba(255, 251, 212, 0.15)',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    borderLeft: m.pctA > 0 ? '1px solid rgba(0,0,0,0.15)' : 'none',
                                    borderRight: m.pctB > 0 ? '1px solid rgba(0,0,0,0.15)' : 'none'
                                  }} title="Draws" />
                                )}
                                {m.pctB > 0 && (
                                  <div style={{
                                    width: `${m.pctB}%`,
                                    background: `${stripedOverlay}, ${m.colorB}`,
                                    borderRadius: m.pctA === 0 && m.pctDraw === 0 ? '99px' : '0 99px 99px 0',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: m.shadowB
                                  }} />
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {m.pctA > 0 && (
                              <div style={{
                                width: `${m.pctA}%`,
                                background: `${stripedOverlay}, ${m.colorA}`,
                                borderRadius: m.pctB === 0 ? '99px' : '99px 0 0 99px',
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: m.shadowA
                              }} />
                            )}
                            {m.pctB > 0 && (
                              <div style={{
                                width: `${m.pctB}%`,
                                background: `${stripedOverlay}, ${m.colorB}`,
                                borderRadius: m.pctA === 0 ? '99px' : '0 99px 99px 0',
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: m.shadowB
                              }} />
                            )}
                          </>
                        )}

                        {/* 50% Center Marker */}
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          background: 'rgba(255, 255, 255, 0.4)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }} />
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Match History Between Them */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '18px' }}>Rivalry Match History</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {headToHeadMatches.map(m => {
                    const isDraw = m.winner_score === m.loser_score;
                    const aScored = m.winner_id === playerAId ? m.winner_score : m.loser_score;
                    const bScored = m.winner_id === playerBId ? m.winner_score : m.loser_score;

                    let outcomeBadge = 'DRAW';
                    let badgeBg = 'rgba(255, 251, 212, 0.05)';
                    let badgeColor = 'var(--text-muted)';
                    let badgeBorder = '1px solid var(--border-color)';

                    if (!isDraw) {
                      if (m.winner_id === playerAId) {
                        outcomeBadge = `${playerA.username} Won`;
                        badgeBg = 'rgba(16,185,129,0.12)';
                        badgeColor = 'var(--success)';
                        badgeBorder = 'none';
                      } else {
                        outcomeBadge = `${playerB.username} Won`;
                        badgeBg = 'rgba(169,14,2,0.12)';
                        badgeColor = 'var(--primary)';
                        badgeBorder = 'none';
                      }
                    }

                    const dateStr = new Date(m.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric'
                    });

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px 24px',
                          borderBottom: '1px solid var(--border-color)',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px', backgroundColor: badgeBg, border: badgeBorder, color: badgeColor }}>
                              {outcomeBadge}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={11} /> {dateStr}
                            </span>
                          </div>
                          {m.troll_comment && (
                            <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                              "{m.troll_comment}"
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          {/* Scores */}
                          <div style={{ fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-white)' }}>
                            {aScored} – {bScored}
                          </div>

                          {/* Screenshot Clickable Thumbnail */}
                          {m.screenshot_url && (
                            <button
                              onClick={() => setSelectedScreenshot(m.screenshot_url)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                padding: '2px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '48px',
                                height: '36px',
                                overflow: 'hidden'
                              }}
                              title="Click to view match evidence"
                            >
                              <img src={m.screenshot_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Screenshot Modal Viewer */}
      {selectedScreenshot && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedScreenshot(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              backgroundColor: '#0a0a0a',
              borderRadius: '8px',
              padding: '6px',
              border: '1.5px solid var(--border-color)'
            }}
          >
            <button
              onClick={() => setSelectedScreenshot(null)}
              style={{
                position: 'absolute',
                top: '-16px', right: '-16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                zIndex: 10000
              }}
            >
              <X size={18} />
            </button>
            <img
              src={selectedScreenshot}
              alt="Match Evidence"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '6px',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};
