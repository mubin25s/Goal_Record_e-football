import React from 'react';
import { Star } from 'lucide-react';
import type { StarData } from '../services/tournamentService';

interface Props {
  starData: StarData;
  compact?: boolean;
}

export const TournamentStarsBadge: React.FC<Props> = ({ starData, compact = false }) => {
  if (starData.totalPoints <= 0 && starData.winsCount <= 0) return null;

  const { fullStars, progressPct, totalPoints, winsCount } = starData;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
      {/* Visual Stars Row */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {/* Full 100% Gold Stars */}
        {Array.from({ length: fullStars }).map((_, idx) => (
          <Star
            key={idx}
            size={compact ? 18 : 22}
            style={{
              color: '#EAB308',
              fill: '#EAB308',
              filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))',
            }}
          />
        ))}

        {/* Partially Filled Star if progressPct > 0 */}
        {progressPct > 0 && (
          <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title={`${progressPct}% filled towards next Star`}
          >
            <svg
              width={compact ? "18" : "22"}
              height={compact ? "18" : "22"}
              viewBox="0 0 24 24"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.3))' }}
            >
              <defs>
                <linearGradient id={`starGrad-${progressPct}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset={`${progressPct}%`} stopColor="#EAB308" />
                  <stop offset={`${progressPct}%`} stopColor="#CBD5E1" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                fill={`url(#starGrad-${progressPct})`}
                stroke="#CA8A04"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#D97706' }}>
              {progressPct}%
            </span>
          </div>
        )}
      </div>

      {/* Champion Badge Pill */}
      {!compact && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.08) 100%)',
          padding: '5px 14px', borderRadius: '20px', border: '1.5px solid #EAB308',
          fontSize: '12px', fontWeight: 800, color: '#A16207', boxShadow: '0 2px 8px rgba(234, 179, 8, 0.25)'
        }}>
          <Star size={14} style={{ fill: '#EAB308', color: '#EAB308' }} />
          {fullStars > 0
            ? `${totalPoints} Stars (${winsCount} Tournaments Won)`
            : `${progressPct}% Star Fill (${winsCount} Tournament Win)`
          }
        </div>
      )}
    </div>
  );
};
