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
  const [stageFilter, setStageFilter] = useState<string>('all');

  const isAdmin = currentUserId !== null; // Authenticated users can create/administer tournaments

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
                                {s.avatar_url ? <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.player_name.slice(0, 2).toUpperCase()}
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

  const renderMatchesList = () => {
    let filtered = matches;
    if (stageFilter !== 'all') {
      filtered = matches.filter(m => m.stage === stageFilter || m.group_letter === stageFilter);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Stage Filter */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button
            onClick={() => setStageFilter('all')}
            className={`btn ${stageFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            All Matches ({matches.length})
          </button>
          <button
            onClick={() => setStageFilter('group')}
            className={`btn ${stageFilter === 'group' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Group Stage
          </button>
          {matches.some(m => m.stage === 'quarter_final') && (
            <button
              onClick={() => setStageFilter('quarter_final')}
              className={`btn ${stageFilter === 'quarter_final' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Quarter-finals
            </button>
          )}
          {matches.some(m => m.stage === 'semi_final') && (
            <button
              onClick={() => setStageFilter('semi_final')}
              className={`btn ${stageFilter === 'semi_final' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Semi-finals
            </button>
          )}
          {matches.some(m => m.stage === 'final') && (
            <button
              onClick={() => setStageFilter('final')}
              className={`btn ${stageFilter === 'final' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Final
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No matches found for selected stage filter.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {filtered.map(m => {
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>
                      {m.stage === 'group' ? `Group ${m.group_letter || 'A'}` : m.stage.replace('_', ' ').toUpperCase()} • Match #{m.match_number}
                    </span>
                    {isDone ? (
                      <span style={{ color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} /> Locked
                      </span>
                    ) : (
                      <span style={{ color: '#facc15' }}>Pending</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Player 1 */}
                    <div style={{ flex: 1, fontWeight: m.winner_id === m.player1_id ? 700 : 400, color: m.winner_id === m.player1_id ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {m.player1_name}
                    </div>

                    {/* Score */}
                    <div style={{ padding: '4px 12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 800, fontSize: '16px' }}>
                      {isDone ? `${m.player1_score} - ${m.player2_score}` : 'VS'}
                    </div>

                    {/* Player 2 */}
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: m.winner_id === m.player2_id ? 700 : m.winner_id === m.player1_id ? 400 : 400, color: m.winner_id === m.player2_id ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {m.player2_name}
                    </div>
                  </div>

                  {/* Proof photo link */}
                  {m.proof_image_url && (
                    <a
                      href={m.proof_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                      📸 View Proof Photo
                    </a>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {!isDone && canSubmit && (
                      <button
                        onClick={() => setUploadingMatch(m)}
                        className="btn btn-primary btn-block"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        Submit Score + Photo
                      </button>
                    )}
                    {isDone && isAdmin && activeTournament?.created_by === currentUserId && (
                      <button
                        onClick={() => handleUnlockMatch(m.id)}
                        className="btn btn-secondary btn-block"
                        style={{ padding: '6px 10px', fontSize: '11px', gap: '4px' }}
                      >
                        <Unlock size={13} /> Unlock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', backgroundColor: 'var(--bg-card)', padding: '12px 16px',
            borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Tournament:</span>
              <select
                className="input-field"
                value={selectedTournamentId || ''}
                onChange={e => setSelectedTournamentId(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 700, flex: 1 }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.player_count} Players) - [{t.status.replace('_', ' ').toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && activeTournament && activeTournament.created_by === currentUserId && (
              <button
                onClick={() => handleDeleteTournament(activeTournament.id, activeTournament.title)}
                className="btn btn-secondary"
                style={{ color: '#f87171', padding: '8px 12px', fontSize: '12px', gap: '6px' }}
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
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
              {activeTab === 'matches' && renderMatchesList()}
              {activeTab === 'bracket' && (
                <div className="card" style={{ border: '1px solid var(--border-color)' }}>
                  <TournamentBracket matches={matches} playerCount={activeTournament.player_count} />
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
