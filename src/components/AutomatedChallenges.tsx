import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Music, 
  Award, 
  Clock, 
  Target,
  Zap,
  Crown,
  Star
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'monthly' | 'weekly' | 'daily' | 'special';
  start_date: string;
  end_date: string;
  requirements: any;
  rewards: any;
  status: 'upcoming' | 'active' | 'completed';
  participants_count: number;
  max_participants?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  status: 'joined' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  submission_url?: string;
  completed_at?: string;
}

export const AutomatedChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadChallenges();
    if (user) {
      loadUserChallenges();
    }
  }, [user]);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching contests:', error);
        return;
      }

      // Transform data to match interface
      const transformedChallenges: Challenge[] = (data || []).map(contest => ({
        id: contest.id,
        title: contest.title,
        description: contest.description,
        type: contest.contest_type as 'monthly' | 'weekly' | 'daily' | 'special',
        start_date: contest.start_date,
        end_date: contest.end_date,
        requirements: { theme: contest.theme },
        rewards: { prize: contest.prize_description },
        status: contest.status as 'upcoming' | 'active' | 'completed',
        participants_count: 0, // Would come from submissions count
        difficulty: 'intermediate' as const
      }));

      setChallenges(transformedChallenges);
    } catch (error: any) {
      toast({ title: 'Failed to load challenges', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadUserChallenges = async () => {
    if (!user) return;
    
    try {
      // Mock user challenges data - replace with actual API call
      setUserChallenges([]);
    } catch (error: any) {
      console.error('Failed to load user challenges:', error);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to join challenges', variant: 'destructive' });
      return;
    }

    try {
      // Check if user already has a submission for this contest
      const { data: existingSubmission } = await supabase
        .from('challenge_submissions')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSubmission) {
        toast({ title: 'Already joined', description: 'You have already joined this challenge!', variant: 'destructive' });
        return;
      }

      // Redirect to contest detail page for submission
      window.location.href = `/contests/${challengeId}`;
    } catch (error: any) {
      toast({ title: 'Failed to join challenge', description: error.message, variant: 'destructive' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'monthly': return <Calendar className="w-4 h-4" />;
      case 'weekly': return <Clock className="w-4 h-4" />;
      case 'daily': return <Zap className="w-4 h-4" />;
      case 'special': return <Crown className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserChallengeStatus = (challengeId: string) => {
    return userChallenges.find(uc => uc.challenge_id === challengeId);
  };

  const filterChallenges = (status: string) => {
    const now = new Date();
    return challenges.filter(challenge => {
      const startDate = new Date(challenge.start_date);
      const endDate = new Date(challenge.end_date);
      
      switch (status) {
        case 'active':
          return startDate <= now && endDate >= now;
        case 'upcoming':
          return startDate > now;
        case 'completed':
          return endDate < now;
        default:
          return true;
      }
    });
  };

  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
    const userChallenge = getUserChallengeStatus(challenge.id);
    const isJoined = !!userChallenge;
    const now = new Date();
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    const isActive = startDate <= now && endDate >= now;
    const isUpcoming = startDate > now;
    const isCompleted = endDate < now;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getTypeIcon(challenge.type)}
              <CardTitle className="text-lg">{challenge.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={`text-xs ${getDifficultyColor(challenge.difficulty)} text-white`}>
                {challenge.difficulty}
              </Badge>
              <Badge variant={isActive ? 'default' : isUpcoming ? 'secondary' : 'outline'}>
                {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Ended'}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Start:</span>
              <div className="font-medium">{formatDate(challenge.start_date)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">End:</span>
              <div className="font-medium">{formatDate(challenge.end_date)}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{challenge.participants_count} participants</span>
            </div>
            {challenge.max_participants && (
              <span className="text-muted-foreground">
                Max: {challenge.max_participants}
              </span>
            )}
          </div>

          {challenge.requirements && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Requirements:</span>
              <ul className="text-xs text-muted-foreground space-y-1">
                {Object.entries(challenge.requirements).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    {key}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {challenge.rewards && (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4" />
                Rewards:
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(challenge.rewards).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {userChallenge && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress:</span>
                <span>{userChallenge.progress}%</span>
              </div>
              <Progress value={userChallenge.progress} />
              <Badge variant={
                userChallenge.status === 'completed' ? 'default' :
                userChallenge.status === 'failed' ? 'destructive' :
                'secondary'
              }>
                {userChallenge.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}

          <div className="flex gap-2">
            {!isJoined && isActive && (
              <Button 
                onClick={() => joinChallenge(challenge.id)}
                className="flex-1"
                disabled={challenge.max_participants && challenge.participants_count >= challenge.max_participants}
              >
                Join Challenge
              </Button>
            )}
            {isJoined && (
              <Button variant="outline" className="flex-1" disabled>
                Joined
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/contests/${challenge.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-primary" />
          Music Challenges
        </h1>
        <p className="text-muted-foreground">
          Join automated challenges, compete with other creators, and earn rewards
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Active ({filterChallenges('active').length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming ({filterChallenges('upcoming').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Completed ({filterChallenges('completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterChallenges('active').map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterChallenges('upcoming').map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterChallenges('completed').map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* User Stats */}
      {user && userChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Your Challenge Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {userChallenges.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Joined</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {userChallenges.filter(uc => uc.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {userChallenges.filter(uc => uc.status === 'in_progress').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {Math.round(
                    userChallenges.filter(uc => uc.status === 'completed').length / 
                    userChallenges.length * 100
                  ) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};