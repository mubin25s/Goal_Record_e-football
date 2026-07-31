import { supabase, uploadMatchScreenshot } from '../supabaseClient';
import type { Player, Match, GroupStanding } from '../utils/tournamentEngine';
import {
  assignGroups,
  generateRoundRobinFixtures,
  calculateGroupStandings,
  generateKnockoutFixtures,
} from '../utils/tournamentEngine';

export interface Tournament {
  id: string;
  title: string;
  player_count: number;
  match_format?: 'single' | 'home_away';
  status: 'group_stage' | 'knockout_stage' | 'completed';
  created_by: string;
  created_at: string;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  player_name: string;
  avatar_url?: string | null;
  group_letter?: string | null;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  stage: 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  group_letter?: string | null;
  match_number: number;
  leg?: number | null;
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
  updated_at: string;
}

/**
 * Create a new Tournament with auto-generated group assignments and fixtures
 */
export async function createTournament(
  title: string,
  playerCount: number,
  selectedPlayers: { id: string; name: string; avatar_url?: string }[],
  createdByUid: string,
  matchFormat: 'single' | 'home_away' = 'single'
): Promise<string> {
  // 1. Insert Tournament Row with match_format (and fallback if schema missing match_format)
  let { data: tourney, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      title,
      player_count: playerCount,
      match_format: matchFormat,
      status: 'group_stage',
      created_by: createdByUid,
    })
    .select()
    .single();

  if (tErr && tErr.message?.includes('match_format')) {
    const fallbackRes = await supabase
      .from('tournaments')
      .insert({
        title,
        player_count: playerCount,
        status: 'group_stage',
        created_by: createdByUid,
      })
      .select()
      .single();
    tourney = fallbackRes.data;
    tErr = fallbackRes.error;
  }

  if (tErr || !tourney) {
    throw new Error(tErr?.message || 'Failed to create tournament');
  }

  const tournamentId = tourney.id;

  // 2. Assign Groups
  const groupedPlayers = assignGroups(selectedPlayers, playerCount);
  const playerInserts: any[] = [];
  const allFixtures: any[] = [];

  for (const groupLetter of Object.keys(groupedPlayers)) {
    const groupList = groupedPlayers[groupLetter];

    groupList.forEach((p, index) => {
      playerInserts.push({
        tournament_id: tournamentId,
        player_id: p.id,
        player_name: p.name,
        avatar_url: p.avatar_url || null,
        group_letter: groupLetter,
        seed: index + 1,
      });
    });

    // For Single Group (<=5 players), matchFormat applies to group stage.
    // For Multi-Group (>5 players), group stage is always single match, and Home & Away starts from knockout stage.
    const groupMatchFormat = playerCount <= 5 ? matchFormat : 'single';
    const fixtures = generateRoundRobinFixtures(groupList, groupLetter, groupMatchFormat);
    fixtures.forEach(f => {
      allFixtures.push({
        tournament_id: tournamentId,
        stage: f.stage,
        group_letter: f.group_letter,
        match_number: f.match_number,
        leg: f.leg || 1,
        player1_id: f.player1_id,
        player1_name: f.player1_name,
        player2_id: f.player2_id,
        player2_name: f.player2_name,
        status: 'pending',
      });
    });
  }

  // 3. Insert Players
  const { error: pErr } = await supabase.from('tournament_players').insert(playerInserts);
  if (pErr) throw new Error(`Failed to save players: ${pErr.message}`);

  // 4. Insert Fixtures (with fallback if leg column missing)
  let { error: mErr } = await supabase.from('tournament_matches').insert(allFixtures);
  if (mErr && mErr.message?.includes('leg')) {
    const cleanFixtures = allFixtures.map(({ leg: _leg, ...rest }) => rest);
    const retryRes = await supabase.from('tournament_matches').insert(cleanFixtures);
    mErr = retryRes.error;
  }

  if (mErr) throw new Error(`Failed to save fixtures: ${mErr.message}`);

  return tournamentId;
}

export interface StarData {
  fullStars: number;
  totalPoints: number;
  progressPct: number;
  winsCount: number;
}

/**
 * Fetch total tournament wins & star progress for a user
 * 3-player tournament win = 0.20 star (5 wins = 1 star / 20% per win)
 * 4-player tournament win = 0.25 star (4 wins = 1 star / 25% per win)
 * 5-player tournament win = 0.333 star (3 wins = 1 star / 33.33% per win)
 * Rest (6+ players) = 1.0 star per win (100% per win)
 */
export async function fetchUserTournamentWins(userId: string, username?: string): Promise<StarData> {
  try {
    const { data: finalMatches } = await supabase
      .from('tournament_matches')
      .select('*, tournaments(player_count)')
      .eq('stage', 'final')
      .in('status', ['completed', 'locked']);

    let starPoints = 0;
    let winsCount = 0;

    if (finalMatches) {
      finalMatches.forEach((m: any) => {
        const isWinner =
          m.winner_id === userId ||
          (username && m.winner_id && (
            (m.player1_id === userId && m.winner_id === m.player1_id) ||
            (m.player2_id === userId && m.winner_id === m.player2_id) ||
            (m.player1_name.toLowerCase() === username.toLowerCase() && m.winner_id === m.player1_id) ||
            (m.player2_name.toLowerCase() === username.toLowerCase() && m.winner_id === m.player2_id)
          ));

        if (isWinner) {
          winsCount++;
          const count = m.tournaments?.player_count || 8;
          if (count === 3) {
            starPoints += 0.20;
          } else if (count === 4) {
            starPoints += 0.25;
          } else if (count === 5) {
            starPoints += (1 / 3);
          } else {
            starPoints += 1.0;
          }
        }
      });
    }

    starPoints = Math.round(starPoints * 1000) / 1000;
    const fullStars = Math.floor(starPoints + 0.0001);
    const partial = starPoints - fullStars;
    const progressPct = Math.min(99, Math.round(partial * 100));

    return {
      fullStars,
      totalPoints: starPoints,
      progressPct: fullStars > 0 && progressPct === 0 ? 0 : progressPct,
      winsCount,
    };
  } catch (err) {
    console.error('fetchUserTournamentWins error:', err);
    return { fullStars: 0, totalPoints: 0, progressPct: 0, winsCount: 0 };
  }
}

/**
 * Fetch all tournaments
 */
export async function fetchAllTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Tournament[]) ?? [];
}

/**
 * Fetch Tournament Details (Players & Matches)
 */
export async function fetchTournamentDetails(tournamentId: string) {
  const [tRes, pRes, mRes, profilesRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId),
    supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('match_number', { ascending: true }),
    supabase.from('profiles').select('id, avatar_url, username'),
  ]);

  if (tRes.error) throw new Error(tRes.error.message);

  const profileMap: Record<string, string | null> = {};
  if (profilesRes.data) {
    profilesRes.data.forEach((prof: any) => {
      if (prof.id) profileMap[prof.id] = prof.avatar_url || null;
    });
  }

  const tournament = tRes.data as Tournament;
  const rawPlayers = (pRes.data as TournamentPlayer[]) ?? [];
  const players = rawPlayers.map(p => ({
    ...p,
    avatar_url: p.avatar_url || profileMap[p.player_id] || profileMap[p.id] || null,
  }));
  const matches = (mRes.data as TournamentMatch[]) ?? [];

  return { tournament, players, matches };
}

/**
 * Delete a Tournament (Admin)
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
  if (error) throw new Error(error.message);
}

/**
 * Submit Match Result with Proof Screenshot
 */
export async function submitTournamentMatchScore(
  matchId: string,
  tournamentId: string,
  player1Score: number,
  player2Score: number,
  proofFile: File,
  submittedByUid: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  // 1. Upload proof photo
  const proofUrl = await uploadMatchScreenshot(proofFile, submittedByUid, onProgress);

  // 2. Determine Winner ID
  const { data: match } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
  if (!match) throw new Error('Match not found');

  let winnerId: string | null = null;
  if (player1Score > player2Score) winnerId = match.player1_id;
  else if (player2Score > player1Score) winnerId = match.player2_id;

  // 3. Update Match to completed & locked
  const { error: updateErr } = await supabase
    .from('tournament_matches')
    .update({
      player1_score: player1Score,
      player2_score: player2Score,
      proof_image_url: proofUrl,
      submitted_by: submittedByUid,
      status: 'locked', // Automatically lock completed matches
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (updateErr) throw new Error(updateErr.message);

  // 4. Check if group stage is finished or knockout stage needs advancement
  await checkAndAdvanceTournamentStage(tournamentId);
}

/**
 * Admin action: Unlock a locked match to allow edit
 */
export async function unlockTournamentMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_matches')
    .update({ status: 'pending' })
    .eq('id', matchId);
  if (error) throw new Error(error.message);
}

/**
 * Check if Stage/Knockout needs automatic advancement
 */
export async function checkAndAdvanceTournamentStage(tournamentId: string): Promise<void> {
  const { tournament, players, matches } = await fetchTournamentDetails(tournamentId);

  // Convert DB players & matches to engine format
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
    leg: m.leg || 1,
    player1_id: m.player1_id,
    player1_name: m.player1_name,
    player2_id: m.player2_id,
    player2_name: m.player2_name,
    player1_score: m.player1_score,
    player2_score: m.player2_score,
    status: m.status,
    winner_id: m.winner_id,
  }));

  const matchFormat = tournament.match_format || 'single';

  // 1. If in group_stage, check if all group matches are done
  if (tournament.status === 'group_stage') {
    const groupMatches = engineMatches.filter(m => m.stage === 'group');
    const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed' || m.status === 'locked');

    if (allGroupDone) {
      // Calculate standings for each group
      const groups = Array.from(new Set(players.map(p => p.group_letter).filter(Boolean))) as string[];
      const standingsByGroup: { [g: string]: GroupStanding[] } = {};

      groups.forEach(g => {
        standingsByGroup[g] = calculateGroupStandings(enginePlayers, engineMatches, g, tournament.player_count);
      });

      // Generate Knockout Stage Fixtures!
      const knockoutFixtures = generateKnockoutFixtures(tournament.player_count, standingsByGroup, matchFormat);

      if (knockoutFixtures.length > 0) {
        const knockoutInserts = knockoutFixtures.map(f => ({
          tournament_id: tournamentId,
          stage: f.stage,
          group_letter: null,
          match_number: f.match_number,
          leg: f.leg || 1,
          player1_id: f.player1_id,
          player1_name: f.player1_name,
          player2_id: f.player2_id,
          player2_name: f.player2_name,
          status: 'pending',
        }));

        let { error: kErr } = await supabase.from('tournament_matches').insert(knockoutInserts);
        if (kErr && kErr.message?.includes('leg')) {
          const cleanKnockout = knockoutInserts.map(({ leg: _leg, ...rest }: any) => rest);
          const retryRes = await supabase.from('tournament_matches').insert(cleanKnockout);
          kErr = retryRes.error;
        }
        if (kErr) throw new Error(`Failed to save knockout fixtures: ${kErr.message}`);
      }

      // Update tournament status to knockout_stage
      await supabase
        .from('tournaments')
        .update({ status: 'knockout_stage' })
        .eq('id', tournamentId);
    }
  }

  // 2. If in knockout_stage, check if current round matches are done and generate next round (e.g. QF -> SF -> Final)
  if (tournament.status === 'knockout_stage') {
    const knockoutMatches = engineMatches.filter(m => m.stage !== 'group');
    const stagesInOrder: ('round_of_16' | 'quarter_final' | 'semi_final' | 'final')[] = [
      'round_of_16',
      'quarter_final',
      'semi_final',
      'final',
    ];

    for (let i = 0; i < stagesInOrder.length - 1; i++) {
      const currentStage = stagesInOrder[i];
      const nextStage = stagesInOrder[i + 1];

      const currentStageMatches = knockoutMatches.filter(m => m.stage === currentStage);
      const nextStageMatches = knockoutMatches.filter(m => m.stage === nextStage);

      if (currentStageMatches.length > 0 && nextStageMatches.length === 0) {
        const allCurrentDone = currentStageMatches.every(m => m.status === 'completed' || m.status === 'locked');
        if (!allCurrentDone) continue;

        // Group current stage matches by match_number
        const matchesByNumber: { [num: number]: Match[] } = {};
        currentStageMatches.forEach(m => {
          if (!matchesByNumber[m.match_number]) matchesByNumber[m.match_number] = [];
          matchesByNumber[m.match_number].push(m);
        });

        const winners: { id: string; name: string }[] = [];
        const sortedMatchNumbers = Object.keys(matchesByNumber).map(Number).sort((a, b) => a - b);

        for (const num of sortedMatchNumbers) {
          const tieMatches = matchesByNumber[num];
          if (tieMatches.length === 1 || currentStage === 'final' || matchFormat !== 'home_away') {
            const m = tieMatches[0];
            if (m.winner_id) {
              const wName = m.winner_id === m.player1_id ? m.player1_name : m.player2_name;
              winners.push({ id: m.winner_id, name: wName });
            }
          } else if (tieMatches.length === 2) {
            // 2-leg tie aggregate calculation
            const leg1 = tieMatches.find(m => m.leg === 1) || tieMatches[0];
            const leg2 = tieMatches.find(m => m.leg === 2) || tieMatches[1];

            const p1Id = leg1.player1_id;
            const p1Name = leg1.player1_name;
            const p2Id = leg1.player2_id;
            const p2Name = leg1.player2_name;

            // Leg 1: p1 vs p2
            const l1_p1 = leg1.player1_score ?? 0;
            const l1_p2 = leg1.player2_score ?? 0;

            // Leg 2: player1 is P2, player2 is P1
            const l2_p2 = leg2.player1_score ?? 0;
            const l2_p1 = leg2.player2_score ?? 0;

            const p1Agg = l1_p1 + l2_p1;
            const p2Agg = l1_p2 + l2_p2;

            let tieWinnerId: string;
            let tieWinnerName: string;

            if (p1Agg > p2Agg) {
              tieWinnerId = p1Id;
              tieWinnerName = p1Name;
            } else if (p2Agg > p1Agg) {
              tieWinnerId = p2Id;
              tieWinnerName = p2Name;
            } else {
              // Tiebreaker fallback: Leg 2 winner or Leg 1 winner
              tieWinnerId = leg2.winner_id || leg1.winner_id || p1Id;
              tieWinnerName = tieWinnerId === p1Id ? p1Name : p2Name;
            }

            winners.push({ id: tieWinnerId, name: tieWinnerName });
          }
        }

        const nextInserts: any[] = [];

        if (currentStage === 'quarter_final' && tournament.player_count === 10) {
          // Special 10 players rule: 3 QF winners.
          if (winners.length >= 3) {
            if (nextStage === 'final' || matchFormat !== 'home_away') {
              nextInserts.push({
                tournament_id: tournamentId,
                stage: 'semi_final',
                match_number: 1,
                leg: 1,
                player1_id: winners[0].id, player1_name: winners[0].name,
                player2_id: winners[2].id, player2_name: winners[2].name,
                status: 'pending',
              });
            } else {
              nextInserts.push({
                tournament_id: tournamentId,
                stage: 'semi_final',
                match_number: 1,
                leg: 1,
                player1_id: winners[0].id, player1_name: winners[0].name,
                player2_id: winners[2].id, player2_name: winners[2].name,
                status: 'pending',
              });
              nextInserts.push({
                tournament_id: tournamentId,
                stage: 'semi_final',
                match_number: 1,
                leg: 2,
                player1_id: winners[2].id, player1_name: winners[2].name,
                player2_id: winners[0].id, player2_name: winners[0].name,
                status: 'pending',
              });
            }

            // Auto place QF2 winner into Final slot or Bye SF
            nextInserts.push({
              tournament_id: tournamentId,
              stage: 'semi_final',
              match_number: 2,
              leg: 1,
              player1_id: winners[1].id, player1_name: winners[1].name,
              player2_id: winners[1].id, player2_name: winners[1].name + ' (Bye)',
              player1_score: 1, player2_score: 0,
              winner_id: winners[1].id,
              status: 'locked',
            });
          }
        } else {
          // Standard pairs: Match 1 vs Match 2, Match 3 vs Match 4
          for (let k = 0; k < winners.length; k += 2) {
            if (winners[k] && winners[k + 1]) {
              const mNum = Math.floor(k / 2) + 1;
              if (nextStage === 'final' || matchFormat !== 'home_away') {
                // Grand Final is ALWAYS 1 single match!
                nextInserts.push({
                  tournament_id: tournamentId,
                  stage: nextStage,
                  match_number: mNum,
                  leg: 1,
                  player1_id: winners[k].id, player1_name: winners[k].name,
                  player2_id: winners[k + 1].id, player2_name: winners[k + 1].name,
                  status: 'pending',
                });
              } else {
                // Home & Away 2-leg knockout round
                nextInserts.push({
                  tournament_id: tournamentId,
                  stage: nextStage,
                  match_number: mNum,
                  leg: 1,
                  player1_id: winners[k].id, player1_name: winners[k].name,
                  player2_id: winners[k + 1].id, player2_name: winners[k + 1].name,
                  status: 'pending',
                });
                nextInserts.push({
                  tournament_id: tournamentId,
                  stage: nextStage,
                  match_number: mNum,
                  leg: 2,
                  player1_id: winners[k + 1].id, player1_name: winners[k + 1].name,
                  player2_id: winners[k].id, player2_name: winners[k].name,
                  status: 'pending',
                });
              }
            }
          }
        }

        if (nextInserts.length > 0) {
          let { error: nErr } = await supabase.from('tournament_matches').insert(nextInserts);
          if (nErr && nErr.message?.includes('leg')) {
            const cleanNext = nextInserts.map(({ leg: _leg, ...rest }: any) => rest);
            const retryRes = await supabase.from('tournament_matches').insert(cleanNext);
            nErr = retryRes.error;
          }
          if (nErr) throw new Error(`Failed to save next round fixtures: ${nErr.message}`);
        }
      }
    }

    // Check if Final match is locked -> Mark tournament completed
    const finalMatch = knockoutMatches.find(m => m.stage === 'final');
    if (finalMatch && (finalMatch.status === 'completed' || finalMatch.status === 'locked')) {
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);
    }
  }
}
