import React from 'react';
import type { TournamentMatch } from '../services/tournamentService';
import { Trophy } from 'lucide-react';

interface Props {
  matches: TournamentMatch[];
  playerCount: number;
}

export const TournamentBracket: React.FC<Props> = ({ matches, playerCount: _playerCount }) => {
  const knockoutMatches = matches.filter(m => m.stage !== 'group');

  const r16 = knockoutMatches.filter(m => m.stage === 'round_of_16');
  const qf = knockoutMatches.filter(m => m.stage === 'quarter_final');
  const sf = knockoutMatches.filter(m => m.stage === 'semi_final');
  const finalMatch = knockoutMatches.find(m => m.stage === 'final');

  if (knockoutMatches.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '40px 20px' }}>
        <Trophy size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Knockout Bracket Not Active Yet</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Complete all group stage matches to automatically unlock and display the tournament bracket tree!
        </p>
      </div>
    );
  }

  const renderMatchCard = (m: TournamentMatch) => {
    const isP1Winner = m.winner_id === m.player1_id;
    const isP2Winner = m.winner_id === m.player2_id;
    const isDone = m.status === 'completed' || m.status === 'locked';

    return (
      <div
        key={m.id}
        style={{
          border: isDone ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid var(--border-color)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          padding: '10px 12px',
          width: '210px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          boxShadow: isDone ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {/* Stage Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Match #{m.match_number}</span>
          {isDone && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Final</span>}
        </div>

        {/* Player 1 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 8px', borderRadius: '6px',
          backgroundColor: isP1Winner ? 'rgba(234, 179, 8, 0.18)' : 'transparent',
          fontWeight: isP1Winner ? 700 : 400,
        }}>
          <span style={{ fontSize: '13px', color: isP1Winner ? 'var(--primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
            {m.player1_name}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>
            {m.player1_score !== null && m.player1_score !== undefined ? m.player1_score : '-'}
          </span>
        </div>

        {/* Player 2 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 8px', borderRadius: '6px',
          backgroundColor: isP2Winner ? 'rgba(234, 179, 8, 0.18)' : 'transparent',
          fontWeight: isP2Winner ? 700 : 400,
        }}>
          <span style={{ fontSize: '13px', color: isP2Winner ? 'var(--primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
            {m.player2_name}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>
            {m.player2_score !== null && m.player2_score !== undefined ? m.player2_score : '-'}
          </span>
        </div>

        {m.proof_image_url && (
          <a href={m.proof_image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--primary)', textAlign: 'center', marginTop: '2px', textDecoration: 'underline' }}>
            View Proof Photo
          </a>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
      <div style={{ display: 'inline-flex', gap: '32px', alignItems: 'center', minWidth: '100%' }}>
        {/* Round of 16 */}
        {r16.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', textTransform: 'uppercase' }}>
              Round of 16
            </h5>
            {r16.map(renderMatchCard)}
          </div>
        )}

        {/* Quarter-finals */}
        {qf.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', textTransform: 'uppercase' }}>
              Quarter-finals
            </h5>
            {qf.map(renderMatchCard)}
          </div>
        )}

        {/* Semi-finals */}
        {sf.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', textTransform: 'uppercase' }}>
              Semi-finals
            </h5>
            {sf.map(renderMatchCard)}
          </div>
        )}

        {/* Final */}
        {finalMatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={18} style={{ color: 'var(--primary)' }} />
              <h5 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Grand Final
              </h5>
            </div>
            {renderMatchCard(finalMatch)}

            {finalMatch.winner_id && (
              <div style={{
                marginTop: '12px', padding: '12px 18px', borderRadius: '12px',
                backgroundColor: 'rgba(234, 179, 8, 0.2)', border: '1.5px solid var(--primary)',
                textAlign: 'center',
              }}>
                <Trophy size={28} style={{ color: 'var(--primary)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tournament Champion
                </p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                  {finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player1_name : finalMatch.player2_name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
