import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Collaboration {
  id: string;
  title: string;
  description: string;
  genre: string;
  skills_needed: string[];
  budget_range: string;
  deadline: string;
  status: string;
  user_id: string;
  created_at: string;
}

const ActiveCollaborations = () => {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCollaborations();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('collaborations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_projects'
        },
        () => {
          fetchCollaborations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCollaborations = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setCollaborations(data || []);
    } catch (error) {
      console.error('Error fetching collaborations:', error);
      toast({
        title: "Error loading collaborations",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just posted';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getUrgencyColor = (deadline: string) => {
    if (!deadline) return '';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) return 'text-red-500';
    if (daysLeft <= 14) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-muted animate-pulse rounded w-64"></div>
            <div className="h-10 bg-muted animate-pulse rounded w-40"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Active Collaborations</h2>
            <p className="text-muted-foreground">Join exciting projects and work with talented creators</p>
          </div>
          <Link to="/collaborate">
            <Button variant="outline">Browse All Projects</Button>
          </Link>
        </div>

        {collaborations.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Collaborations</h3>
              <p className="text-muted-foreground mb-4">Be the first to start a collaboration project!</p>
              <Link to="/collaborate">
                <Button>Start a Project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collaborations.map((collab) => (
              <Card key={collab.id} className="hover:shadow-glow transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {collab.title}
                        </CardTitle>
                        <Badge variant="secondary">{collab.genre}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeAgo(collab.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      {collab.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground line-clamp-2">{collab.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {collab.skills_needed.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {collab.skills_needed.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{collab.skills_needed.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>{collab.budget_range || 'Budget TBD'}</span>
                    </div>
                    {collab.deadline && (
                      <div className={`flex items-center gap-1 ${getUrgencyColor(collab.deadline)}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(collab.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Link to={`/collaborate/${collab.id}`}>
                      <Button className="w-full group-hover:shadow-glow transition-all">
                        View Details & Apply
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ActiveCollaborations;