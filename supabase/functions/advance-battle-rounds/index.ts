import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetBattleId: string | undefined;
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        if (body && typeof body.battleId === 'string') {
          targetBattleId = body.battleId;
        }
      } catch (parseError) {
        if (!(parseError instanceof SyntaxError)) {
          console.warn('Failed to parse request body for advance-battle-rounds:', parseError);
        }
      }
    }

    // Get all live battles (optionally filtered to a single battle)
    let battlesQuery = supabase
      .from('battles')
      .select('id, title')
      .eq('status', 'live');

    if (targetBattleId) {
      battlesQuery = battlesQuery.eq('id', targetBattleId);
    }

    const { data: liveBattles, error: battlesError } = await battlesQuery;

    if (battlesError) {
      console.error('Error fetching live battles:', battlesError);
      throw battlesError;
    }

    console.log(`Processing ${liveBattles?.length || 0} live battles`);

    for (const battle of liveBattles || []) {
      await processBattle(supabase, battle.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: liveBattles?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in advance-battle-rounds:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processBattle(supabase: any, battleId: string) {
  try {
    // Get current round that should have ended
    const { data: rounds, error: roundsError } = await supabase
      .from('battle_rounds')
      .select('*')
      .eq('battle_id', battleId)
      .lt('ends_at', new Date().toISOString())
      .order('round_number', { ascending: false })
      .limit(1);

    if (roundsError) throw roundsError;
    if (!rounds || rounds.length === 0) return;

    const currentRound = rounds[0];
    
    // Get matchups for this round
    const { data: matchups, error: matchupsError } = await supabase
      .from('battle_matchups')
      .select(`
        id,
        entry_a_id,
        entry_b_id,
        winner_entry_id,
        battle_votes (
          entry_id,
          voter_user_id
        )
      `)
      .eq('battle_id', battleId)
      .eq('round_number', currentRound.round_number);

    if (matchupsError) throw matchupsError;

    // Process each matchup
    for (const matchup of matchups || []) {
      if (matchup.winner_entry_id) continue; // Already processed

      // Count votes for each entry
      const votesA = matchup.battle_votes?.filter((v: any) => v.entry_id === matchup.entry_a_id).length || 0;
      const votesB = matchup.battle_votes?.filter((v: any) => v.entry_id === matchup.entry_b_id).length || 0;

      // Determine winner
      let winnerId;
      if (votesA > votesB) {
        winnerId = matchup.entry_a_id;
      } else if (votesB > votesA) {
        winnerId = matchup.entry_b_id;
      } else {
        // Tie - randomly select winner
        winnerId = Math.random() > 0.5 ? matchup.entry_a_id : matchup.entry_b_id;
      }

      // Update matchup with winner
      await supabase
        .from('battle_matchups')
        .update({ winner_entry_id: winnerId })
        .eq('id', matchup.id);

      console.log(`Battle ${battleId} round ${currentRound.round_number}: Entry ${winnerId} wins (${votesA} vs ${votesB} votes)`);
    }

    // Check if this was the final round
    const { data: nextRounds } = await supabase
      .from('battle_rounds')
      .select('id')
      .eq('battle_id', battleId)
      .gt('round_number', currentRound.round_number);

    if (!nextRounds || nextRounds.length === 0) {
      // This was the final round - mark battle as finished
      await supabase
        .from('battles')
        .update({ status: 'finished' })
        .eq('id', battleId);
      
      console.log(`Battle ${battleId} finished`);
    } else {
      // Create matchups for next round
      await createNextRoundMatchups(supabase, battleId, currentRound.round_number + 1);
    }

  } catch (error) {
    console.error(`Error processing battle ${battleId}:`, error);
  }
}

async function createNextRoundMatchups(supabase: any, battleId: string, nextRoundNumber: number) {
  try {
    // Get winners from previous round
    const { data: winners, error: winnersError } = await supabase
      .from('battle_matchups')
      .select('winner_entry_id')
      .eq('battle_id', battleId)
      .eq('round_number', nextRoundNumber - 1)
      .not('winner_entry_id', 'is', null);

    if (winnersError) throw winnersError;
    if (!winners || winners.length < 2) return;

    // Create matchups for next round
    const matchups = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        matchups.push({
          battle_id: battleId,
          round_number: nextRoundNumber,
          entry_a_id: winners[i].winner_entry_id,
          entry_b_id: winners[i + 1].winner_entry_id
        });
      }
    }

    if (matchups.length > 0) {
      const { error: inserError } = await supabase
        .from('battle_matchups')
        .insert(matchups);

      if (inserError) throw inserError;
      console.log(`Created ${matchups.length} matchups for battle ${battleId} round ${nextRoundNumber}`);
    }

  } catch (error) {
    console.error(`Error creating next round matchups:`, error);
  }
}