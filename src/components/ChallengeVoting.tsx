import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Play, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  submission_title: string;
  submission_description?: string;
  submission_url?: string;
  votes_count: number;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
  };
  hasVoted?: boolean;
}

interface ChallengeVotingProps {
  challengeId: string;
  challengeTitle: string;
}

export const ChallengeVoting = ({ challengeId, challengeTitle }: ChallengeVotingProps) => {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
    
    // Subscribe to real-time vote updates
    const channel = supabase
      .channel('contest-votes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_votes',
          filter: `contest_id=eq.${challengeId}`
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const fetchSubmissions = async () => {
    try {
      // Fetch submissions with vote counts
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('votes_count', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch user profiles separately
      const userIds = submissionsData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, username')
        .in('user_id', userIds);

      // Map profiles to submissions
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const submissionsWithProfiles = submissionsData?.map(submission => ({
        ...submission,
        profiles: profilesMap.get(submission.user_id)
      })) || [];


      if (user) {
        // Check which submissions the current user has voted for
        const { data: userVotes, error: votesError } = await supabase
          .from('contest_votes')
          .select('submission_id')
          .eq('contest_id', challengeId)
          .eq('voter_id', user.id);

        if (votesError) throw votesError;

        const votedSubmissionIds = new Set(userVotes.map(vote => vote.submission_id));
        
        setSubmissions(submissionsWithProfiles.map(submission => ({
          ...submission,
          hasVoted: votedSubmissionIds.has(submission.id)
        })));
      } else {
        setSubmissions(submissionsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load challenge submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to vote",
        variant: "destructive",
      });
      return;
    }

    setVotingLoading(submissionId);

    try {
      const { error } = await supabase
        .from('contest_votes')
        .insert({
          contest_id: challengeId,
          submission_id: submissionId,
          voter_id: user.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already voted",
            description: "You've already voted for this submission",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Vote recorded",
          description: "Your vote has been counted!",
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive",
      });
    } finally {
      setVotingLoading(null);
    }
  };

  const playSubmission = (url?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(console.error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Challenge Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{challengeTitle} - Vote for Your Favorite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No submissions yet for this challenge.
          </p>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {submission.profiles?.full_name || submission.profiles?.username || 'Anonymous'}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-1">{submission.submission_title}</h4>
                    {submission.submission_description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {submission.submission_description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {submission.votes_count} votes
                      </Badge>
                      {submission.hasVoted && (
                        <Badge variant="outline" className="text-primary">
                          ✓ Voted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {submission.submission_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playSubmission(submission.submission_url)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Play
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleVote(submission.id)}
                      disabled={
                        votingLoading === submission.id || 
                        submission.hasVoted ||
                        !user
                      }
                      variant={submission.hasVoted ? "secondary" : "default"}
                      className="flex items-center gap-1"
                    >
                      <Heart className="h-3 w-3" />
                      {votingLoading === submission.id ? "Voting..." : "Vote"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};