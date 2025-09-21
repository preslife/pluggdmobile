import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Clock, Award } from "lucide-react";
import { getContestStatus, getTimeRemaining } from "@/utils/contests";

interface Challenge {
  id: string;
  title: string;
  description: string;
  theme?: string;
  status: string;
  prize_description?: string;
  start_date: string;
  end_date: string;
  voting_end_date?: string;
  calculatedStatus?: string;
}

const ContestsWidget = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const { data } = await supabase
          .from('contests')
          .select('*')
          .order('start_date', { ascending: true });

        if (data) {
          // Filter by actual date-based status and limit to 4 most relevant contests
          const filteredChallenges = data
            .map(contest => ({
              ...contest,
              calculatedStatus: getContestStatus(contest)
            }))
            .filter(contest => 
              contest.calculatedStatus === 'active' || 
              contest.calculatedStatus === 'voting' || 
              contest.calculatedStatus === 'upcoming'
            )
            .slice(0, 4);

          setChallenges(filteredChallenges);
        }
      } catch (error) {
        console.error('Error fetching challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary text-primary-foreground';
      case 'voting':
        return 'bg-accent text-accent-foreground';
      case 'upcoming':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-3 h-3" />;
      case 'voting':
        return <Trophy className="w-3 h-3" />;
      case 'upcoming':
        return <Calendar className="w-3 h-3" />;
      default:
        return <Award className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (challenges.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <Trophy className="w-8 h-8 inline-block mr-2 text-gold" />
            Active <span className="bg-gradient-primary bg-clip-text text-transparent">Contests</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our community challenges and showcase your talent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {challenges.map((challenge) => {
            const currentStatus = challenge.calculatedStatus || getContestStatus(challenge);
            const timeLeft = getTimeRemaining(challenge);
            
            return (
              <Card key={challenge.id} className="group hover:shadow-glow transition-all duration-300 border-accent/20">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStatusColor(currentStatus)}>
                      {getStatusIcon(currentStatus)}
                      <span className="ml-1 capitalize">{currentStatus}</span>
                    </Badge>
                    {challenge.theme && (
                      <Badge variant="outline" className="text-xs">
                        {challenge.theme}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                    {challenge.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {challenge.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {challenge.prize_description && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Award className="w-4 h-4 text-gold" />
                      <span className="text-gold font-medium">{challenge.prize_description}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft}</span>
                  </div>

                  <Button className="w-full" variant="outline" asChild>
                    <Link to={`/contests/${challenge.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/challenges">
            <Button variant="outline" size="lg" className="shadow-card">
              View All Contests
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ContestsWidget;