import React from 'react';
import type { TournamentMatch, TournamentPlayer } from '../services/tournamentService';
import { Trophy } from 'lucide-react';

interface Props {
  matches: TournamentMatch[];
  players: TournamentPlayer[];
  playerCount: number;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const PlayerAvatar: React.FC<{ name: string; avatarUrl?: string | null; size?: number; winner?: boolean }> = ({
  name, avatarUrl, size = 32, winner = false,
}) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    overflow: 'hidden', flexShrink: 0,
    border: winner ? '2px solid #eab308' : '2px solid rgba(255,255,255,0.12)',
    boxShadow: winner ? '0 0 8px rgba(234,179,8,0.6)' : 'none',
    backgroundColor: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.35, color: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }}>
    {avatarUrl
      ? <img src={avatarUrl} alt={name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : name.slice(0, 2).toUpperCase()
    }
  </div>
);

// ── Match Slot Card ───────────────────────────────────────────────────────────
const MatchSlot: React.FC<{
  match: TournamentMatch | null;
  avatarMap: Record<string, string | null | undefined>;
  leg?: number;
  isLegHeader?: boolean;
}> = ({ match, avatarMap, leg }) => {
  if (!match) {
    return (
      <div style={{
        width: 220, borderRadius: 12, padding: '10px 14px',
        border: '1px dashed rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', gap: 6,
        opacity: 0.5,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TBD</div>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          </div>
        ))}
      </div>
    );
  }

  const isDone = match.status === 'completed' || match.status === 'locked';
  const p1Win = match.winner_id === match.player1_id;
  const p2Win = match.winner_id === match.player2_id;
  const legLabel = leg != null ? (leg === 1 ? 'Leg 1 · Home' : 'Leg 2 · Away') : null;

  return (
    <div style={{
      width: 220, borderRadius: 12, overflow: 'hidden',
      border: isDone ? '1.5px solid rgba(234,179,8,0.45)' : '1px solid rgba(255,255,255,0.1)',
      backgroundColor: isDone ? 'rgba(234,179,8,0.04)' : 'rgba(255,255,255,0.03)',
      boxShadow: isDone ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(255,255,255,0.03)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Match #{match.match_number}
        </span>
        {legLabel && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8,
            backgroundColor: leg === 1 ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)',
            color: leg === 1 ? '#60a5fa' : '#c084fc',
            border: leg === 1 ? '1px solid rgba(96,165,250,0.35)' : '1px solid rgba(192,132,252,0.35)',
          }}>
            {legLabel}
          </span>
        )}
        {isDone && !legLabel && (
          <span style={{ fontSize: 9, fontWeight: 800, color: '#eab308', padding: '2px 7px', borderRadius: 8, backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
            Done
          </span>
        )}
      </div>

      {/* Player 1 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', gap: 8,
        backgroundColor: p1Win ? 'rgba(234,179,8,0.1)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <PlayerAvatar name={match.player1_name} avatarUrl={avatarMap[match.player1_id]} size={28} winner={p1Win} />
          <span style={{
            fontSize: 12, fontWeight: p1Win ? 800 : 500,
            color: p1Win ? '#eab308' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {match.player1_name}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: p1Win ? '#eab308' : 'var(--text-primary)', minWidth: 20, textAlign: 'right' }}>
          {isDone && match.player1_score != null ? match.player1_score : '–'}
        </span>
      </div>

      {/* Player 2 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', gap: 8,
        backgroundColor: p2Win ? 'rgba(234,179,8,0.1)' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <PlayerAvatar name={match.player2_name} avatarUrl={avatarMap[match.player2_id]} size={28} winner={p2Win} />
          <span style={{
            fontSize: 12, fontWeight: p2Win ? 800 : 500,
            color: p2Win ? '#eab308' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {match.player2_name}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: p2Win ? '#eab308' : 'var(--text-primary)', minWidth: 20, textAlign: 'right' }}>
          {isDone && match.player2_score != null ? match.player2_score : '–'}
        </span>
      </div>
    </div>
  );
};

// ── 2-Leg Tie Card ────────────────────────────────────────────────────────────
const TieCard: React.FC<{
  leg1: TournamentMatch;
  leg2: TournamentMatch;
  avatarMap: Record<string, string | null | undefined>;
}> = ({ leg1, leg2, avatarMap }) => {
  const l1Done = leg1.status === 'completed' || leg1.status === 'locked';
  const l2Done = leg2.status === 'completed' || leg2.status === 'locked';

  const p1Agg = (l1Done ? leg1.player1_score ?? 0 : 0) + (l2Done ? leg2.player2_score ?? 0 : 0);
  const p2Agg = (l1Done ? leg1.player2_score ?? 0 : 0) + (l2Done ? leg2.player1_score ?? 0 : 0);
  const tieDone = l1Done && l2Done;

  const p1Wins = tieDone && (p1Agg > p2Agg || (p1Agg === p2Agg && leg2.winner_id === leg1.player1_id));
  const p2Wins = tieDone && (p2Agg > p1Agg || (p1Agg === p2Agg && leg2.winner_id === leg1.player2_id));

  return (
    <div style={{
      width: 230, borderRadius: 12, overflow: 'hidden',
      border: tieDone ? '1.5px solid rgba(234,179,8,0.5)' : '1px solid rgba(255,255,255,0.1)',
      backgroundColor: tieDone ? 'rgba(234,179,8,0.04)' : 'rgba(255,255,255,0.03)',
      boxShadow: tieDone ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{
        padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Tie #{leg1.match_number}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
          {tieDone ? 'L1 · L2 · AGG' : 'L1 · L2'}
        </span>
      </div>

      {/* Player 1 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', gap: 8,
        backgroundColor: p1Wins ? 'rgba(234,179,8,0.1)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <PlayerAvatar name={leg1.player1_name} avatarUrl={avatarMap[leg1.player1_id]} size={28} winner={p1Wins} />
          <span style={{
            fontSize: 12, fontWeight: p1Wins ? 800 : 500,
            color: p1Wins ? '#eab308' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
          }}>
            {leg1.player1_name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.85 }} title="Leg 1">{l1Done ? leg1.player1_score : '–'}</span>
          <span style={{ opacity: 0.3, fontSize: 10 }}>·</span>
          <span style={{ fontSize: 12, opacity: 0.85 }} title="Leg 2">{l2Done ? leg2.player2_score : '–'}</span>
          {tieDone && <span style={{ fontWeight: 800, fontSize: 13, color: '#eab308', marginLeft: 2 }}>({p1Agg})</span>}
        </div>
      </div>

      {/* Player 2 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', gap: 8,
        backgroundColor: p2Wins ? 'rgba(234,179,8,0.1)' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <PlayerAvatar name={leg1.player2_name} avatarUrl={avatarMap[leg1.player2_id]} size={28} winner={p2Wins} />
          <span style={{
            fontSize: 12, fontWeight: p2Wins ? 800 : 500,
            color: p2Wins ? '#eab308' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
          }}>
            {leg1.player2_name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.85 }} title="Leg 1">{l1Done ? leg1.player2_score : '–'}</span>
          <span style={{ opacity: 0.3, fontSize: 10 }}>·</span>
          <span style={{ fontSize: 12, opacity: 0.85 }} title="Leg 2">{l2Done ? leg2.player1_score : '–'}</span>
          {tieDone && <span style={{ fontWeight: 800, fontSize: 13, color: '#eab308', marginLeft: 2 }}>({p2Agg})</span>}
        </div>
      </div>
    </div>
  );
};

// ── Connector Lines ───────────────────────────────────────────────────────────
const Connector: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return <div style={{ width: 28 }} />;
  return (
    <div style={{ width: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignSelf: 'stretch' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <svg width="28" height="100%" style={{ overflow: 'visible', display: 'block' }}>
            <line x1="0" y1="50%" x2="28" y2="50%" stroke="rgba(234,179,8,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        </div>
      ))}
    </div>
  );
};

// ── Stage Column ──────────────────────────────────────────────────────────────
const StageColumn: React.FC<{
  label: string;
  cards: React.ReactNode[];
  highlight?: boolean;
}> = ({ label, cards, highlight }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
    {/* Stage Label */}
    <div style={{
      marginBottom: 14, padding: '4px 14px', borderRadius: 20,
      backgroundColor: highlight ? 'rgba(234,179,8,0.18)' : 'rgba(255,255,255,0.05)',
      border: highlight ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.08)',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: highlight ? '#eab308' : 'var(--text-muted)',
      }}>
        {label}
      </span>
    </div>
    {/* Cards stacked vertically */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {cards}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const TournamentBracket: React.FC<Props> = ({ matches, players, playerCount: _playerCount }) => {
  const knockoutMatches = matches.filter(m => m.stage !== 'group');

  const r16 = knockoutMatches.filter(m => m.stage === 'round_of_16');
  const qf = knockoutMatches.filter(m => m.stage === 'quarter_final');
  const sf = knockoutMatches.filter(m => m.stage === 'semi_final');
  const finalMatch = knockoutMatches.find(m => m.stage === 'final');

  // Build avatar lookup from TournamentPlayer list
  const avatarMap: Record<string, string | null | undefined> = {};
  players.forEach(p => { avatarMap[p.player_id] = p.avatar_url; });

  if (knockoutMatches.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Trophy size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 16 }} />
        <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Knockout Bracket Not Active Yet
        </h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
          Complete all group stage matches to automatically unlock and display the bracket!
        </p>
      </div>
    );
  }

  // Build grouped tie cards for a stage
  const buildStageCards = (stageMatches: TournamentMatch[]) => {
    const groups: Record<number, TournamentMatch[]> = {};
    stageMatches.forEach(m => {
      if (!groups[m.match_number]) groups[m.match_number] = [];
      groups[m.match_number].push(m);
    });
    const nums = Object.keys(groups).map(Number).sort((a, b) => a - b);

    return nums.map(num => {
      const g = groups[num];
      if (g.length === 1) {
        return <MatchSlot key={`m${num}`} match={g[0]} avatarMap={avatarMap} />;
      }
      const leg1 = g.find(m => m.leg === 1) || g[0];
      const leg2 = g.find(m => m.leg === 2) || g[1];
      return <TieCard key={`tie${num}`} leg1={leg1} leg2={leg2} avatarMap={avatarMap} />;
    });
  };

  const r16Cards = buildStageCards(r16);
  const qfCards = buildStageCards(qf);
  const sfCards = buildStageCards(sf);

  // Final card
  const finalCard = finalMatch ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <MatchSlot match={finalMatch} avatarMap={avatarMap} />
      {finalMatch.winner_id && (
        <div style={{
          padding: '12px 20px', borderRadius: 12, textAlign: 'center',
          backgroundColor: 'rgba(234,179,8,0.15)', border: '1.5px solid #eab308',
          boxShadow: '0 0 24px rgba(234,179,8,0.2)',
        }}>
          <Trophy size={24} style={{ color: '#eab308', margin: '0 auto 6px' }} />
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>
            Champion
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <PlayerAvatar
              name={finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player1_name : finalMatch.player2_name}
              avatarUrl={avatarMap[finalMatch.winner_id]}
              size={36}
              winner
            />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#eab308' }}>
              {finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player1_name : finalMatch.player2_name}
            </span>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div style={{ overflowX: 'auto', padding: '12px 8px 24px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 0,
        minWidth: 'max-content',
      }}>
        {/* R16 */}
        {r16Cards.length > 0 && (
          <>
            <StageColumn label="Round of 16" cards={r16Cards} />
            <Connector count={qfCards.length} />
          </>
        )}

        {/* QF */}
        {qfCards.length > 0 && (
          <>
            <StageColumn label="Quarter-finals" cards={qfCards} />
            <Connector count={sfCards.length} />
          </>
        )}

        {/* SF */}
        {sfCards.length > 0 && (
          <>
            <StageColumn label="Semi-finals" cards={sfCards} />
            <Connector count={1} />
          </>
        )}

        {/* Final */}
        {finalCard && (
          <StageColumn label="Grand Final" cards={[finalCard]} highlight />
        )}
      </div>
    </div>
  );
};
