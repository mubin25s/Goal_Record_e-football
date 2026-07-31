export interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  group_letter?: string;
}

export interface Match {
  id?: string;
  tournament_id?: string;
  stage: 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  group_letter?: string;
  match_number: number;
  leg?: number;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  player1_score?: number | null;
  player2_score?: number | null;
  proof_image_url?: string | null;
  submitted_by?: string | null;
  status: 'pending' | 'completed' | 'locked';
  winner_id?: string | null;
}

export interface GroupStanding {
  player_id: string;
  player_name: string;
  avatar_url?: string;
  group_letter: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  rank: number;
  status?: 'qualified' | 'eliminated' | 'pending';
}

export const ALLOWED_PLAYER_COUNTS = [3, 4, 5, 8, 10, 12, 16, 32] as const;

/**
 * Standard Berger Round-Robin Fixture Generator
 */
export function generateRoundRobinFixtures(
  players: Player[],
  groupLetter: string,
  matchFormat: 'single' | 'home_away' = 'single'
): Omit<Match, 'id' | 'tournament_id'>[] {
  const n = players.length;
  const list = [...players];
  const isOdd = n % 2 !== 0;

  // If odd number of players, add a dummy bye player
  if (isOdd) {
    list.push({ id: '__BYE__', name: 'BYE' });
  }

  const numPlayers = list.length;
  const rounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;
  const fixtures: Omit<Match, 'id' | 'tournament_id'>[] = [];
  let matchNumber = 1;

  for (let r = 0; r < rounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = list[(r + m) % (numPlayers - 1)];
      let p2: Player;

      if (m === 0) {
        p2 = list[numPlayers - 1];
      } else {
        p2 = list[(r + numPlayers - 1 - m) % (numPlayers - 1)];
      }

      // Ignore matches involving BYE
      if (p1.id !== '__BYE__' && p2.id !== '__BYE__') {
        fixtures.push({
          stage: 'group',
          group_letter: groupLetter,
          match_number: matchNumber++,
          leg: 1,
          player1_id: p1.id,
          player1_name: p1.name,
          player2_id: p2.id,
          player2_name: p2.name,
          player1_score: null,
          player2_score: null,
          status: 'pending',
        });
      }
    }
  }

  if (matchFormat === 'home_away') {
    const leg1Count = fixtures.length;
    for (let i = 0; i < leg1Count; i++) {
      const f = fixtures[i];
      fixtures.push({
        stage: 'group',
        group_letter: groupLetter,
        match_number: matchNumber++,
        leg: 2,
        player1_id: f.player2_id,
        player1_name: f.player2_name,
        player2_id: f.player1_id,
        player2_name: f.player1_name,
        player1_score: null,
        player2_score: null,
        status: 'pending',
      });
    }
  }

  return fixtures;
}

/**
 * Divide players into groups based on player count
 */
export function assignGroups(players: Player[], playerCount: number): { [groupLetter: string]: Player[] } {
  if (!ALLOWED_PLAYER_COUNTS.includes(playerCount as any)) {
    throw new Error(`Player count ${playerCount} is not allowed. Allowed counts: ${ALLOWED_PLAYER_COUNTS.join(', ')}`);
  }

  const shuffle = [...players];
  const groups: { [groupLetter: string]: Player[] } = {};

  if (playerCount === 3 || playerCount === 4 || playerCount === 5) {
    groups['A'] = shuffle.map(p => ({ ...p, group_letter: 'A' }));
  } else if (playerCount === 8) {
    // 2 groups of 4
    groups['A'] = shuffle.slice(0, 4).map(p => ({ ...p, group_letter: 'A' }));
    groups['B'] = shuffle.slice(4, 8).map(p => ({ ...p, group_letter: 'B' }));
  } else if (playerCount === 10) {
    // 2 groups of 5
    groups['A'] = shuffle.slice(0, 5).map(p => ({ ...p, group_letter: 'A' }));
    groups['B'] = shuffle.slice(5, 10).map(p => ({ ...p, group_letter: 'B' }));
  } else if (playerCount === 12) {
    // 2 groups of 6
    groups['A'] = shuffle.slice(0, 6).map(p => ({ ...p, group_letter: 'A' }));
    groups['B'] = shuffle.slice(6, 12).map(p => ({ ...p, group_letter: 'B' }));
  } else if (playerCount === 16) {
    // 4 groups of 4
    const letters = ['A', 'B', 'C', 'D'];
    letters.forEach((letter, idx) => {
      groups[letter] = shuffle.slice(idx * 4, (idx + 1) * 4).map(p => ({ ...p, group_letter: letter }));
    });
  } else if (playerCount === 32) {
    // 8 groups of 4
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    letters.forEach((letter, idx) => {
      groups[letter] = shuffle.slice(idx * 4, (idx + 1) * 4).map(p => ({ ...p, group_letter: letter }));
    });
  }

  return groups;
}

/**
 * Calculate Group Standings with tie-breaker logic
 */
export function calculateGroupStandings(
  players: Player[],
  matches: Match[],
  groupLetter: string,
  totalPlayersInTournament: number
): GroupStanding[] {
  const standingsMap: { [id: string]: GroupStanding } = {};

  const groupPlayers = players.filter(p => p.group_letter === groupLetter);
  groupPlayers.forEach(p => {
    standingsMap[p.id] = {
      player_id: p.id,
      player_name: p.name,
      avatar_url: p.avatar_url,
      group_letter: groupLetter,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      rank: 0,
    };
  });

  const groupMatches = matches.filter(m => m.stage === 'group' && m.group_letter === groupLetter);

  groupMatches.forEach(m => {
    if (m.status === 'completed' || m.status === 'locked') {
      const s1 = m.player1_score ?? 0;
      const s2 = m.player2_score ?? 0;

      const p1 = standingsMap[m.player1_id];
      const p2 = standingsMap[m.player2_id];

      if (p1) {
        p1.played += 1;
        p1.goals_for += s1;
        p1.goals_against += s2;
        p1.goal_difference = p1.goals_for - p1.goals_against;
        if (s1 > s2) {
          p1.won += 1;
          p1.points += 3;
        } else if (s1 === s2) {
          p1.drawn += 1;
          p1.points += 1;
        } else {
          p1.lost += 1;
        }
      }

      if (p2) {
        p2.played += 1;
        p2.goals_for += s2;
        p2.goals_against += s1;
        p2.goal_difference = p2.goals_for - p2.goals_against;
        if (s2 > s1) {
          p2.won += 1;
          p2.points += 3;
        } else if (s1 === s2) {
          p2.drawn += 1;
          p2.points += 1;
        } else {
          p2.lost += 1;
        }
      }
    }
  });

  const standingsList = Object.values(standingsMap);

  // Sorting based on Tie-Breaker Rules:
  // 1. Points
  // 2. Goal Difference
  // 3. Goals For
  // 4. Wins
  // 5. Head-to-head (if 2 players)
  standingsList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (b.won !== a.won) return b.won - a.won;

    // Head to head check
    const h2hMatches = groupMatches.filter(
      m => (m.player1_id === a.player_id && m.player2_id === b.player_id) ||
           (m.player1_id === b.player_id && m.player2_id === a.player_id)
    );
    let aH2hWins = 0;
    let bH2hWins = 0;
    h2hMatches.forEach(h2h => {
      if (h2h.status === 'completed' || h2h.status === 'locked') {
        if (h2h.winner_id === a.player_id) aH2hWins++;
        if (h2h.winner_id === b.player_id) bH2hWins++;
      }
    });
    if (aH2hWins !== bH2hWins) return bH2hWins - aH2hWins;

    return a.player_name.localeCompare(b.player_name);
  });

  // Assign ranks & qualification status based on total format
  const qualifiedCount = getQualificationCountPerGroup(totalPlayersInTournament, groupLetter);

  const allMatchesFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed' || m.status === 'locked');

  standingsList.forEach((s, idx) => {
    s.rank = idx + 1;
    if (allMatchesFinished) {
      s.status = s.rank <= qualifiedCount ? 'qualified' : 'eliminated';
    } else {
      s.status = 'pending';
    }
  });

  return standingsList;
}

function getQualificationCountPerGroup(totalPlayers: number, _groupLetter: string): number {
  switch (totalPlayers) {
    case 3:
    case 4:
      return 2; // Top 2 to Final
    case 5:
      return 4; // Top 4 to Semi-finals
    case 8:
      return 2; // Top 2 from Group A & B to SF
    case 10:
      return 3; // Top 3 from Group A & B (bottom 2 eliminated)
    case 12:
      return 4; // Top 4 from Group A & B to QF
    case 16:
      return 2; // Top 2 from 4 groups to QF
    case 32:
      return 2; // Top 2 from 8 groups to R16
    default:
      return 2;
  }
}

/**
 * Generate Knockout Stage Matches automatically when all group matches are done
 */
export function generateKnockoutFixtures(
  playerCount: number,
  allGroupStandings: { [groupLetter: string]: GroupStanding[] },
  matchFormat: 'single' | 'home_away' = 'single'
): Omit<Match, 'id' | 'tournament_id'>[] {
  const knockoutMatches: Omit<Match, 'id' | 'tournament_id'>[] = [];

  const pushPairing = (
    stage: 'round_of_16' | 'quarter_final' | 'semi_final' | 'final',
    mNum: number,
    p1: { id: string; name: string },
    p2: { id: string; name: string }
  ) => {
    if (stage === 'final' || matchFormat !== 'home_away') {
      knockoutMatches.push({
        stage,
        match_number: mNum,
        leg: 1,
        player1_id: p1.id,
        player1_name: p1.name,
        player2_id: p2.id,
        player2_name: p2.name,
        status: 'pending',
      });
    } else {
      // Home & Away 2-leg knockout match
      knockoutMatches.push({
        stage,
        match_number: mNum,
        leg: 1,
        player1_id: p1.id,
        player1_name: p1.name,
        player2_id: p2.id,
        player2_name: p2.name,
        status: 'pending',
      });
      knockoutMatches.push({
        stage,
        match_number: mNum,
        leg: 2,
        player1_id: p2.id,
        player1_name: p2.name,
        player2_id: p1.id,
        player2_name: p1.name,
        status: 'pending',
      });
    }
  };

  if (playerCount === 3 || playerCount === 4) {
    // Top 2 of Group A -> Final
    const groupA = allGroupStandings['A'] || [];
    const p1 = groupA[0];
    const p2 = groupA[1];
    if (p1 && p2) {
      pushPairing('final', 1, { id: p1.player_id, name: p1.player_name }, { id: p2.player_id, name: p2.player_name });
    }
  } else if (playerCount === 5) {
    // Top 4 of Group A -> Semi-finals (1 vs 4, 2 vs 3) -> Final
    const groupA = allGroupStandings['A'] || [];
    if (groupA.length >= 4) {
      pushPairing('semi_final', 1, { id: groupA[0].player_id, name: groupA[0].player_name }, { id: groupA[3].player_id, name: groupA[3].player_name });
      pushPairing('semi_final', 2, { id: groupA[1].player_id, name: groupA[1].player_name }, { id: groupA[2].player_id, name: groupA[2].player_name });
    }
  } else if (playerCount === 8) {
    // Group A & B top 2 -> SF (A1 vs B2, B1 vs A2)
    const gA = allGroupStandings['A'] || [];
    const gB = allGroupStandings['B'] || [];
    if (gA.length >= 2 && gB.length >= 2) {
      pushPairing('semi_final', 1, { id: gA[0].player_id, name: gA[0].player_name }, { id: gB[1].player_id, name: gB[1].player_name });
      pushPairing('semi_final', 2, { id: gB[0].player_id, name: gB[0].player_name }, { id: gA[1].player_id, name: gA[1].player_name });
    }
  } else if (playerCount === 10) {
    // Top 3 from Group A & B -> QF: A1 vs B3, A2 vs B1, A3 vs B2
    const gA = allGroupStandings['A'] || [];
    const gB = allGroupStandings['B'] || [];
    if (gA.length >= 3 && gB.length >= 3) {
      pushPairing('quarter_final', 1, { id: gA[0].player_id, name: gA[0].player_name }, { id: gB[2].player_id, name: gB[2].player_name });
      pushPairing('quarter_final', 2, { id: gA[1].player_id, name: gA[1].player_name }, { id: gB[0].player_id, name: gB[0].player_name });
      pushPairing('quarter_final', 3, { id: gA[2].player_id, name: gA[2].player_name }, { id: gB[1].player_id, name: gB[1].player_name });
    }
  } else if (playerCount === 12) {
    // Top 4 from Group A & B -> QF: A1 vs B4, A2 vs B3, B1 vs A4, B2 vs A3
    const gA = allGroupStandings['A'] || [];
    const gB = allGroupStandings['B'] || [];
    if (gA.length >= 4 && gB.length >= 4) {
      pushPairing('quarter_final', 1, { id: gA[0].player_id, name: gA[0].player_name }, { id: gB[3].player_id, name: gB[3].player_name });
      pushPairing('quarter_final', 2, { id: gA[1].player_id, name: gA[1].player_name }, { id: gB[2].player_id, name: gB[2].player_name });
      pushPairing('quarter_final', 3, { id: gB[0].player_id, name: gB[0].player_name }, { id: gA[3].player_id, name: gA[3].player_name });
      pushPairing('quarter_final', 4, { id: gB[1].player_id, name: gB[1].player_name }, { id: gA[2].player_id, name: gA[2].player_name });
    }
  } else if (playerCount === 16) {
    // Top 2 from 4 groups -> QF: A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2
    const gA = allGroupStandings['A'] || [];
    const gB = allGroupStandings['B'] || [];
    const gC = allGroupStandings['C'] || [];
    const gD = allGroupStandings['D'] || [];
    if (gA.length >= 2 && gB.length >= 2 && gC.length >= 2 && gD.length >= 2) {
      pushPairing('quarter_final', 1, { id: gA[0].player_id, name: gA[0].player_name }, { id: gB[1].player_id, name: gB[1].player_name });
      pushPairing('quarter_final', 2, { id: gC[0].player_id, name: gC[0].player_name }, { id: gD[1].player_id, name: gD[1].player_name });
      pushPairing('quarter_final', 3, { id: gB[0].player_id, name: gB[0].player_name }, { id: gA[1].player_id, name: gA[1].player_name });
      pushPairing('quarter_final', 4, { id: gD[0].player_id, name: gD[0].player_name }, { id: gC[1].player_id, name: gC[1].player_name });
    }
  } else if (playerCount === 32) {
    // Top 2 from 8 groups -> R16
    const g = allGroupStandings;
    if (g['A'] && g['B'] && g['C'] && g['D'] && g['E'] && g['F'] && g['G'] && g['H']) {
      const pairings = [
        { p1: g['A'][0], p2: g['B'][1] },
        { p1: g['C'][0], p2: g['D'][1] },
        { p1: g['E'][0], p2: g['F'][1] },
        { p1: g['G'][0], p2: g['H'][1] },
        { p1: g['B'][0], p2: g['A'][1] },
        { p1: g['D'][0], p2: g['C'][1] },
        { p1: g['F'][0], p2: g['E'][1] },
        { p1: g['H'][0], p2: g['G'][1] },
      ];
      pairings.forEach((pair, idx) => {
        pushPairing('round_of_16', idx + 1, { id: pair.p1.player_id, name: pair.p1.player_name }, { id: pair.p2.player_id, name: pair.p2.player_name });
      });
    }
  }

  return knockoutMatches;
}
