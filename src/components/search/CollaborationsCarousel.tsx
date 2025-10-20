import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Users, Clock, DollarSign, Calendar, TrendingUp, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildBudgetBenchmarks, estimateBudgetForProject, type BudgetBenchmarks } from "@/lib/collaborationBudget";

interface Collaboration {
  id: string;
  title: string;
  description: string;
  genre: string;
  skills_needed: string[];
  budget_range: string;
  deadline: string;
  status: string;
  created_at: string;
}

export const CollaborationsCarousel = () => {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetBenchmarks, setBudgetBenchmarks] = useState<BudgetBenchmarks>({ perGenre: {} });

  useEffect(() => {
    fetchActiveCollaborations();
  }, []);

  const fetchActiveCollaborations = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setCollaborations(data || []);
      await fetchBudgetBenchmarks();
    } catch (error) {
      console.error('Error fetching collaborations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('budget_range, genre')
        .not('budget_range', 'is', null)
        .limit(200);

      if (error) throw error;

      setBudgetBenchmarks(buildBudgetBenchmarks(data || []));
    } catch (error) {
      console.error('Error preparing budget benchmarks:', error);
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
    if (!deadline) return 'text-muted-foreground';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) return 'text-red-500';
    if (daysLeft <= 14) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading || collaborations.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary to-purple-500 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            Active Collaborations
          </h2>
          <p className="text-muted-foreground">
            Join live projects and work with talented creators from around the world
          </p>
        </div>
        <Link to="/collaborate">
          <Button variant="outline" className="group">
            Browse All Projects
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {collaborations.map((collab) => {
            const budgetEstimate = estimateBudgetForProject(budgetBenchmarks, collab);

            return (
              <CarouselItem key={collab.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="group h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <Zap className="w-3 h-3 mr-1" />
                        {collab.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(collab.created_at)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {collab.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {collab.genre}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Hot
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {collab.description}
                    </p>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Skills Needed:</p>
                      <div className="flex flex-wrap gap-1">
                        {collab.skills_needed.slice(0, 2).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {collab.skills_needed.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{collab.skills_needed.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between text-xs">
                      <div className="flex items-start gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3 mt-0.5" />
                        <div>
                          {collab.budget_range ? (
                            <span className="font-medium text-foreground">{collab.budget_range}</span>
                          ) : (
                            <div className="space-y-1">
                              <span>{budgetEstimate ? `Estimated ${budgetEstimate}` : 'Budget pending'}</span>
                              {budgetEstimate && (
                                <Badge variant="outline" className="text-[10px]">
                                  Est. {budgetEstimate}
                                </Badge>
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                Join the project to message the owner and confirm the budget.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {collab.deadline && (
                        <div className={`flex items-center gap-1 ${getUrgencyColor(collab.deadline)}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(collab.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <Link to={`/collaborate/${collab.id}`}>
                        <Button className="w-full group-hover:shadow-lg transition-all bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                          <Users className="w-4 h-4 mr-2" />
                          Join Project
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-12" />
        <CarouselNext className="hidden md:flex -right-12" />
      </Carousel>

      {/* CTA Section */}
      <div className="mt-8 text-center">
        <Card className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 border-2 border-primary/10">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-2">Ready to Start Your Own Project?</h3>
            <p className="text-muted-foreground mb-4">
              Connect with thousands of creators and bring your musical vision to life
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/collaborate/create">
                <Button size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                  <Zap className="w-5 h-5 mr-2" />
                  Start a Collaboration
                </Button>
              </Link>
              <Link to="/collaborate">
                <Button variant="outline" size="lg">
                  Browse All Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};