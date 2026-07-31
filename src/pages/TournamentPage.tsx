import React, { useState, useEffect } from 'react';
import type { Tournament, TournamentPlayer, TournamentMatch } from '../services/tournamentService';
import {
  fetchAllTournaments,
  fetchTournamentDetails,
  deleteTournament,
  unlockTournamentMatch,
} from '../services/tournamentService';
import type { Player, Match } from '../utils/tournamentEngine';
import { calculateGroupStandings } from '../utils/tournamentEngine';
import { TournamentCreateModal } from '../components/TournamentCreateModal';
import { MatchUploadModal } from '../components/MatchUploadModal';
import { TournamentBracket } from '../components/TournamentBracket';
import { Trophy, Plus, Trash2, Lock, Unlock, Calendar, Award, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  currentUserId: string | null;
  currentUsername: string;
}

export const TournamentPage: React.FC<Props> = ({ currentUserId, currentUsername: _currentUsername }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // Active Tournament state
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket'>('standings');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingMatch, setUploadingMatch] = useState<TournamentMatch | null>(null);


  const isAdmin = currentUserId !== null; // Authenticated users can create/administer tournaments

  const avatarMap = React.useMemo(() => {
    const map: Record<string, string | null> = {};
    players.forEach(p => {
      if (p.player_id) map[p.player_id] = p.avatar_url || null;
      if (p.id) map[p.id] = p.avatar_url || null;
    });
    return map;
  }, [players]);

  // Load tournament list
  const loadTournaments = React.useCallback(async () => {
    try {
      setLoadingList(true);
      const list = await fetchAllTournaments();
      setTournaments(list);
      if (list.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // Load active tournament details
  const loadActiveTournament = async (id: string) => {
    try {
      setLoadingDetails(true);
      const details = await fetchTournamentDetails(id);
      setActiveTournament(details.tournament);
      setPlayers(details.players);
      setMatches(details.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedTournamentId) {
      loadActiveTournament(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  const handleDeleteTournament = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete tournament "${title}"? This cannot be undone.`)) {
      try {
        await deleteTournament(id);
        if (selectedTournamentId === id) {
          setSelectedTournamentId(null);
          setActiveTournament(null);
        }
        await loadTournaments();
      } catch (err: any) {
        alert(err.message || 'Failed to delete tournament');
      }
    }
  };

  const handleUnlockMatch = async (matchId: string) => {
    if (confirm('Unlock this completed match for re-editing?')) {
      try {
        await unlockTournamentMatch(matchId);
        if (selectedTournamentId) loadActiveTournament(selectedTournamentId);
      } catch (err: any) {
        alert(err.message || 'Failed to unlock match');
      }
    }
  };

  // Compute standings grouped by group_letter
  const renderGroupTables = () => {
    if (!activeTournament || players.length === 0) return null;

    const groupLetters = Array.from(new Set(players.map(p => p.group_letter).filter(Boolean))) as string[];
    if (groupLetters.length === 0) groupLetters.push('A');

    const enginePlayers: Player[] = players.map(p => ({
      id: p.player_id,
      name: p.player_name,
      avatar_url: p.avatar_url || undefined,
      group_letter: p.group_letter || undefined,
    }));

    const engineMatches: Match[] = matches.map(m => ({
      id: m.id,
      stage: m.stage,
      group_letter: m.group_letter || undefined,
      match_number: m.match_number,
      player1_id: m.player1_id,
      player1_name: m.player1_name,
      player2_id: m.player2_id,
      player2_name: m.player2_name,
      player1_score: m.player1_score,
      player2_score: m.player2_score,
      status: m.status,
      winner_id: m.winner_id,
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {groupLetters.map(letter => {
          const standings = calculateGroupStandings(
            enginePlayers,
            engineMatches,
            letter,
            activeTournament.player_count
          );

          return (
            <div key={letter} className="card" style={{ border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                  Group {letter} Standings
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {standings.length} Players
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                      <th style={{ padding: '8px' }}>P</th>
                      <th style={{ padding: '8px' }}>W</th>
                      <th style={{ padding: '8px' }}>D</th>
                      <th style={{ padding: '8px' }}>L</th>
                      <th style={{ padding: '8px' }}>GF</th>
                      <th style={{ padding: '8px' }}>GA</th>
                      <th style={{ padding: '8px' }}>GD</th>
                      <th style={{ padding: '8px' }}>PTS</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => {
                      const isQualified = s.status === 'qualified';
                      const isEliminated = s.status === 'eliminated';
                      return (
                        <tr
                          key={s.player_id}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: isQualified ? 'rgba(34, 197, 94, 0.05)' : isEliminated ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                            textAlign: 'center',
                          }}
                        >
                          <td style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'left' }}>{s.rank}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                backgroundColor: 'var(--primary)', color: 'var(--bg-dark)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '10px', overflow: 'hidden'
                              }}>
                                {s.avatar_url ? <img src={s.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.player_name.slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ color: 'var(--text-primary)' }}>{s.player_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 8px' }}>{s.played}</td>
                          <td style={{ padding: '10px 8px', color: '#4ade80' }}>{s.won}</td>
                          <td style={{ padding: '10px 8px', color: '#facc15' }}>{s.drawn}</td>
                          <td style={{ padding: '10px 8px', color: '#f87171' }}>{s.lost}</td>
                          <td style={{ padding: '10px 8px' }}>{s.goals_for}</td>
                          <td style={{ padding: '10px 8px' }}>{s.goals_against}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: s.goal_difference > 0 ? '#4ade80' : s.goal_difference < 0 ? '#f87171' : 'inherit' }}>
                            {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '15px', color: 'var(--primary)' }}>
                            {s.points}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            {isQualified ? (
                              <span style={{
                                padding: '3px 8px', borderRadius: '12px',
                                backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80',
                                fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                                <CheckCircle2 size={12} /> Qualified
                              </span>
                            ) : isEliminated ? (
                              <span style={{
                                padding: '3px 8px', borderRadius: '12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171',
                                fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                                <XCircle size={12} /> Eliminated
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>In Progress</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMatchCard = (m: TournamentMatch) => {
    const isDone = m.status === 'completed' || m.status === 'locked';
    const canSubmit = currentUserId && (
      currentUserId === m.player1_id ||
      currentUserId === m.player2_id ||
      activeTournament?.created_by === currentUserId
    );

    return (
      <div
        key={m.id}
        className="card"
        style={{
          padding: '14px',
          border: isDone ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)',
            }}>
              {m.stage === 'group' ? `Group ${m.group_letter || 'A'}` : m.stage.replace(/_/g, ' ').toUpperCase()}
            </span>

            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Match #{m.match_number}
            </span>

            {activeTournament?.match_format === 'home_away' && m.stage !== 'final' && (
              (m.stage === 'group' && activeTournament.player_count > 5) ? null : (
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '12px',
                  backgroundColor: (m.leg || 1) === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                  color: (m.leg || 1) === 1 ? '#60a5fa' : '#c084fc',
                  border: (m.leg || 1) === 1 ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(192, 132, 252, 0.4)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}>
                  {(m.leg || 1) === 1 ? 'Leg 1 (Home)' : 'Leg 2 (Away)'}
                </span>
              )
            )}
          </div>

          {isDone ? (
            <span style={{
              fontSize: '11px', color: 'var(--primary)', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              backgroundColor: 'rgba(234, 179, 8, 0.15)', padding: '3px 8px', borderRadius: '6px',
              border: '1px solid rgba(234, 179, 8, 0.3)'
            }}>
              <Lock size={12} /> Locked
            </span>
          ) : (
            <span style={{
              fontSize: '11px', color: '#facc15', fontWeight: 700,
              backgroundColor: 'rgba(250, 204, 21, 0.12)', padding: '3px 8px', borderRadius: '6px',
              border: '1px solid rgba(250, 204, 21, 0.25)'
            }}>
              Pending
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Player 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--primary)', color: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', overflow: 'hidden',
              border: m.winner_id === m.player1_id ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.15)',
              boxShadow: m.winner_id === m.player1_id ? '0 0 6px rgba(234,179,8,0.5)' : 'none',
            }}>
              {avatarMap[m.player1_id] ? (
                <img src={avatarMap[m.player1_id]!} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                m.player1_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <span style={{
              fontWeight: m.winner_id === m.player1_id ? 700 : 400,
              color: m.winner_id === m.player1_id ? 'var(--primary)' : 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px'
            }}>
              {m.player1_name}
            </span>
          </div>

          {/* Score */}
          <div style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
            {isDone ? `${m.player1_score} - ${m.player2_score}` : 'VS'}
          </div>

          {/* Player 2 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{
              fontWeight: m.winner_id === m.player2_id ? 700 : 400,
              color: m.winner_id === m.player2_id ? 'var(--primary)' : 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', textAlign: 'right'
            }}>
              {m.player2_name}
            </span>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--primary)', color: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', overflow: 'hidden',
              border: m.winner_id === m.player2_id ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.15)',
              boxShadow: m.winner_id === m.player2_id ? '0 0 6px rgba(234,179,8,0.5)' : 'none',
            }}>
              {avatarMap[m.player2_id] ? (
                <img src={avatarMap[m.player2_id]!} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                m.player2_name.slice(0, 2).toUpperCase()
              )}
            </div>
          </div>
        </div>

        {m.proof_image_url && (
          <a href={m.proof_image_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'underline' }}>
            View Proof Photo
          </a>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {!isDone && canSubmit && (
            <button onClick={() => setUploadingMatch(m)} className="btn btn-primary btn-block"
              style={{ padding: '6px 10px', fontSize: '12px' }}>
              Submit Score + Photo
            </button>
          )}
          {isDone && isAdmin && activeTournament?.created_by === currentUserId && (
            <button onClick={() => handleUnlockMatch(m.id)} className="btn btn-secondary btn-block"
              style={{ padding: '6px 10px', fontSize: '11px', gap: '4px' }}>
              <Unlock size={13} /> Unlock
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMatchesList = () => {
    const groupMatches = matches.filter(m => m.stage === 'group');


    const SectionHeader = ({ label, count, accent }: { label: string; count: number; accent: string }) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderRadius: '10px',
        backgroundColor: `${accent}14`,
        border: `1px solid ${accent}30`,
        marginBottom: '10px',
      }}>
        <div style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }} />
        <span style={{ fontSize: '14px', fontWeight: 800, color: accent }}>{label}</span>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
          backgroundColor: `${accent}20`, color: accent,
        }}>
          {count} matches
        </span>
      </div>
    );


    const knockoutStages = [
      { key: 'round_of_16',   label: 'Round of 16',    accent: '#38bdf8' },
      { key: 'quarter_final', label: 'Quarter-finals',  accent: '#f59e0b' },
      { key: 'semi_final',    label: 'Semi-finals',     accent: '#a78bfa' },
      { key: 'final',         label: 'Grand Final',     accent: '#eab308' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Group Stage ─────────────────────────────── */}
        {groupMatches.length > 0 && (
          <div>
            <SectionHeader label="Group Stage" count={groupMatches.length} accent="#4ade80" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupMatches.map(m => renderMatchCard(m))}
            </div>
          </div>
        )}

        {/* ── Knockout Sub-sections ────────────────────── */}
        {knockoutStages.map(({ key, label, accent }) => {
          const stageMatches = matches.filter(m => m.stage === key)
            .sort((a, b) => a.match_number - b.match_number);
          if (stageMatches.length === 0) return null;
          return (
            <div key={key}>
              <SectionHeader label={label} count={stageMatches.length} accent={accent} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stageMatches.map(m => renderMatchCard(m))}
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No matches yet.
          </p>
        )}
      </div>
    );
  };





  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1.5px solid var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
          }}>
            <Trophy size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Tournament Arena</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Official e-Football Match Schedules & Knockouts
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: '10px 18px', gap: '8px', fontSize: '13px' }}
          >
            <Plus size={18} /> Create Tournament
          </button>
        )}
      </div>

      {/* Tournament Selector Dropdown / List */}
      {loadingList ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading tournaments…</p>
      ) : tournaments.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <Trophy size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.4 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Tournaments Yet</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            There are no active tournaments. Click below to create one!
          </p>
          {isAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create First Tournament
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Tournament Bar */}
          <div style={{
            backgroundColor: 'var(--bg-card)', padding: '12px 14px',
            borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {/* Row 1: label */}
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Tournament
            </span>

            {/* Row 2: dropdown + delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="input-field"
                value={selectedTournamentId || ''}
                onChange={e => setSelectedTournamentId(e.target.value)}
                style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 700, flex: 1, minWidth: 0 }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {t.player_count}P · {t.status.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>

              {isAdmin && activeTournament && activeTournament.created_by === currentUserId && (
                <button
                  onClick={() => handleDeleteTournament(activeTournament.id, activeTournament.title)}
                  className="btn btn-secondary"
                  style={{ color: '#f87171', padding: '8px 10px', fontSize: '12px', gap: '4px', flexShrink: 0 }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>


          {/* Active Tournament Content */}
          {loadingDetails ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading tournament data…</p>
          ) : activeTournament && (
            <div>
              {/* Navigation Tabs */}
              <div style={{
                display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)',
                marginBottom: '20px', paddingBottom: '8px',
              }}>
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`btn ${activeTab === 'standings' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
                >
                  <Award size={16} /> Group Standings
                </button>
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`btn ${activeTab === 'matches' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
                >
                  <Calendar size={16} /> Matches & Schedule ({matches.length})
                </button>
                <button
                  onClick={() => setActiveTab('bracket')}
                  className={`btn ${activeTab === 'bracket' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
                >
                  <Trophy size={16} /> Knockout Bracket
                </button>
              </div>

              {/* Tab Views */}
              {activeTab === 'standings' && renderGroupTables()}

              {activeTab === 'matches' && (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  {/* Left: Match upload cards */}
                  <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 480 }}>
                    {renderMatchesList()}
                  </div>
                  {/* Right: Bracket viewer */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    backgroundColor: 'var(--bg-card)', borderRadius: '16px',
                    border: '1px solid var(--border-color)', padding: '16px',
                    position: 'sticky', top: '80px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Trophy size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>Knockout Bracket</span>
                    </div>
                    <TournamentBracket matches={matches} players={players} playerCount={activeTournament.player_count} />
                  </div>
                </div>
              )}

              {activeTab === 'bracket' && (
                <div className="card" style={{ border: '1px solid var(--border-color)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <Trophy size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Knockout Bracket</h3>
                  </div>
                  <TournamentBracket matches={matches} players={players} playerCount={activeTournament.player_count} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <TournamentCreateModal
          currentUserId={currentUserId || 'guest'}
          onClose={() => setShowCreateModal(false)}
          onSuccess={async (newId) => {
            setShowCreateModal(false);
            await loadTournaments();
            setSelectedTournamentId(newId);
          }}
        />
      )}

      {/* Match Score & Photo Upload Modal */}
      {uploadingMatch && activeTournament && (
        <MatchUploadModal
          match={uploadingMatch}
          tournamentId={activeTournament.id}
          currentUserId={currentUserId || 'guest'}
          onClose={() => setUploadingMatch(null)}
          onSuccess={async () => {
            setUploadingMatch(null);
            if (selectedTournamentId) await loadActiveTournament(selectedTournamentId);
          }}
        />
      )}
    </div>
  );
};
