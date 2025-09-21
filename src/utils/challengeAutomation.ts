import { supabase } from "@/integrations/supabase/client";

// Monthly Challenge Automation Utilities
export class ChallengeAutomation {
  
  // Create a new monthly challenge
  static async createMonthlyChallenge(
    title: string,
    description: string,
    theme: string,
    rules: string,
    prizeDescription: string
  ) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const votingEndDate = new Date(endDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days after submissions end

    const { data, error } = await supabase
      .from('monthly_challenges')
      .insert({
        title,
        description,
        theme,
        rules,
        prize_description: prizeDescription,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        voting_end_date: votingEndDate.toISOString().split('T')[0],
        status: 'active'
      })
      .select()
      .single();

    return { data, error };
  }

  // Check for active challenges and their status
  static async getActiveChallenges() {
    const { data, error } = await supabase
      .from('monthly_challenges')
      .select('*')
      .in('status', ['active', 'voting'])
      .order('start_date', { ascending: false });

    return { data, error };
  }

  // Update challenge status based on dates
  static async updateChallengeStatuses() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Move to voting phase
    await supabase
      .from('monthly_challenges')
      .update({ status: 'voting' })
      .eq('status', 'active')
      .lte('end_date', today);

    // Complete voting and select winners
    const { data: completedChallenges } = await supabase
      .from('monthly_challenges')
      .select('*')
      .eq('status', 'voting')
      .lte('voting_end_date', today);

    if (completedChallenges) {
      for (const challenge of completedChallenges) {
        await this.selectWinner(challenge.id);
      }
    }
  }

  // Automatically select winner based on votes
  static async selectWinner(challengeId: string) {
    const { data: submissions, error } = await supabase
      .from('challenge_submissions')
      .select('id, user_id, votes_count')
      .eq('challenge_id', challengeId)
      .order('votes_count', { ascending: false })
      .limit(1);

    if (error || !submissions?.length) {
      console.error('Error selecting winner:', error);
      return;
    }

    const winner = submissions[0];

    // Update challenge with winner
    await supabase
      .from('monthly_challenges')
      .update({ 
        winner_id: winner.user_id,
        status: 'completed'
      })
      .eq('id', challengeId);

    // Award achievement to winner
    await supabase
      .from('user_achievements')
      .insert({
        user_id: winner.user_id,
        achievement_type: 'challenge_winner',
        achievement_name: 'Monthly Challenge Champion',
        description: 'Won a monthly music challenge',
        points_awarded: 500
      });

    return winner;
  }

  // Generate suggested challenges based on trends
  static generateChallengeSuggestions() {
    const themes = [
      'Lo-Fi Beats',
      'Trap Bangers',
      'R&B Vibes',
      'Electronic Fusion',
      'Hip-Hop Classics',
      'Jazz Reimagined',
      'Future Bass',
      'Boom Bap Revival',
      'Melodic Dubstep',
      'Ambient Soundscapes'
    ];

    const rules = [
      'Must be original composition',
      '90 seconds maximum length',
      'Include at least one vocal element',
      'Use provided sample pack',
      'Collaborate with another producer',
      'Create without using drums',
      'Focus on melody over rhythm',
      'Remix a classic track',
      'Use only vintage equipment/samples',
      'Cross-genre fusion required'
    ];

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomRule = rules[Math.floor(Math.random() * rules.length)];

    return {
      title: `${randomTheme} Challenge`,
      theme: randomTheme,
      rules: randomRule,
      description: `Create an original ${randomTheme.toLowerCase()} track following the challenge rules.`,
      prizeDescription: 'Winner receives producer pack and feature on Pluggd homepage'
    };
  }
}

// Auto-scheduler for monthly challenges
export const scheduleMonthlyChallenge = () => {
  const now = new Date();
  const isFirstDayOfMonth = now.getDate() === 1;
  
  if (isFirstDayOfMonth) {
    const suggestion = ChallengeAutomation.generateChallengeSuggestions();
    
    // Create new challenge automatically
    ChallengeAutomation.createMonthlyChallenge(
      suggestion.title,
      suggestion.description,
      suggestion.theme,
      suggestion.rules,
      suggestion.prizeDescription
    );
  }
  
  // Check and update challenge statuses daily
  ChallengeAutomation.updateChallengeStatuses();
};