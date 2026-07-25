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
  createdByUid: string
): Promise<string> {
  // 1. Insert Tournament Row
  const { data: tourney, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      title,
      player_count: playerCount,
      status: 'group_stage',
      created_by: createdByUid,
    })
    .select()
    .single();

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

    const fixtures = generateRoundRobinFixtures(groupList, groupLetter);
    fixtures.forEach(f => {
      allFixtures.push({
        tournament_id: tournamentId,
        stage: f.stage,
        group_letter: f.group_letter,
        match_number: f.match_number,
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

  // 4. Insert Fixtures
  const { error: mErr } = await supabase.from('tournament_matches').insert(allFixtures);
  if (mErr) throw new Error(`Failed to save fixtures: ${mErr.message}`);

  return tournamentId;
}

/**
 * Fetch total tournament wins (stars) for a user
 */
export async function fetchUserTournamentWins(userId: string, username?: string): Promise<number> {
  try {
    const { data: finalMatches } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('stage', 'final')
      .in('status', ['completed', 'locked']);

    let winCount = 0;
    if (finalMatches) {
      finalMatches.forEach((m: any) => {
        if (
          m.winner_id === userId ||
          (username && m.winner_id && (
            (m.player1_id === userId && m.winner_id === m.player1_id) ||
            (m.player2_id === userId && m.winner_id === m.player2_id) ||
            (m.player1_name.toLowerCase() === username.toLowerCase() && m.winner_id === m.player1_id) ||
            (m.player2_name.toLowerCase() === username.toLowerCase() && m.winner_id === m.player2_id)
          ))
        ) {
          winCount++;
        }
      });
    }

    return winCount;
  } catch (err) {
    console.error('fetchUserTournamentWins error:', err);
    return 0;
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
  const [tRes, pRes, mRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId),
    supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('match_number', { ascending: true }),
  ]);

  if (tRes.error) throw new Error(tRes.error.message);

  const tournament = tRes.data as Tournament;
  const players = (pRes.data as TournamentPlayer[]) ?? [];
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
    player1_id: m.player1_id,
    player1_name: m.player1_name,
    player2_id: m.player2_id,
    player2_name: m.player2_name,
    player1_score: m.player1_score,
    player2_score: m.player2_score,
    status: m.status,
    winner_id: m.winner_id,
  }));

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
      const knockoutFixtures = generateKnockoutFixtures(tournament.player_count, standingsByGroup);

      if (knockoutFixtures.length > 0) {
        const knockoutInserts = knockoutFixtures.map(f => ({
          tournament_id: tournamentId,
          stage: f.stage,
          group_letter: null,
          match_number: f.match_number,
          player1_id: f.player1_id,
          player1_name: f.player1_name,
          player2_id: f.player2_id,
          player2_name: f.player2_name,
          status: 'pending',
        }));

        await supabase.from('tournament_matches').insert(knockoutInserts);
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

      if (
        currentStageMatches.length > 0 &&
        currentStageMatches.every(m => (m.status === 'completed' || m.status === 'locked') && m.winner_id) &&
        nextStageMatches.length === 0
      ) {
        // Build next stage pairings from winners of current stage
        const winners = currentStageMatches.map(m => {
          const wId = m.winner_id!;
          const wName = wId === m.player1_id ? m.player1_name : m.player2_name;
          return { id: wId, name: wName };
        });

        const nextInserts: any[] = [];

        if (currentStage === 'quarter_final' && tournament.player_count === 10) {
          // Special 10 players rule: 3 QF winners.
          // QF1 winner (A1/B3) vs QF3 winner (A3/B2) -> SF
          // QF2 winner (A2/B1) -> Bye to Final or SF
          if (winners.length >= 3) {
            nextInserts.push({
              tournament_id: tournamentId,
              stage: 'semi_final',
              match_number: 1,
              player1_id: winners[0].id, player1_name: winners[0].name,
              player2_id: winners[2].id, player2_name: winners[2].name,
              status: 'pending',
            });
            // Auto place QF2 winner into Final slot or Bye SF
            nextInserts.push({
              tournament_id: tournamentId,
              stage: 'semi_final',
              match_number: 2,
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
              nextInserts.push({
                tournament_id: tournamentId,
                stage: nextStage,
                match_number: Math.floor(k / 2) + 1,
                player1_id: winners[k].id, player1_name: winners[k].name,
                player2_id: winners[k + 1].id, player2_name: winners[k + 1].name,
                status: 'pending',
              });
            }
          }
        }

        if (nextInserts.length > 0) {
          await supabase.from('tournament_matches').insert(nextInserts);
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
