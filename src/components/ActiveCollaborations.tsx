import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, DollarSign, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  user_id: string;
  created_at: string;
}

const ActiveCollaborations = () => {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetBenchmarks, setBudgetBenchmarks] = useState<BudgetBenchmarks>({ perGenre: {} });
  const [editingProject, setEditingProject] = useState<Collaboration | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetReminderId, setBudgetReminderId] = useState<string | null>(null);
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
      console.error('Error building budget benchmarks:', error);
    }
  };

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
      await fetchBudgetBenchmarks();
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

  const openBudgetDialog = (project: Collaboration) => {
    const suggestion = estimateBudgetForProject(budgetBenchmarks, project);
    setBudgetInput(project.budget_range || suggestion || '');
    setEditingProject(project);
  };

  const saveBudgetRange = async () => {
    if (!editingProject) return;

    const value = budgetInput.trim();
    if (!value) {
      toast({
        title: 'Budget required',
        description: 'Please enter a budget range before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSavingBudget(true);

    try {
      const { error } = await supabase
        .from('collaboration_projects')
        .update({ budget_range: value })
        .eq('id', editingProject.id)
        .eq('user_id', editingProject.user_id);

      if (error) throw error;

      toast({
        title: 'Budget updated',
        description: 'Your collaboration now shows a clear budget range.',
      });

      setEditingProject(null);
      setBudgetInput('');
      await fetchCollaborations();
    } catch (error: any) {
      console.error('Unable to update budget', error);
      toast({
        title: 'Unable to update budget',
        description: error?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleBudgetReminder = async (project: Collaboration) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Log in to request a budget update from the owner.',
        variant: 'destructive',
      });
      return;
    }

    setBudgetReminderId(project.id);

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: project.user_id,
          title: 'Budget update requested',
          body: `${user.email ?? 'A collaborator'} asked for a budget range on "${project.title}"`,
          url: `/studio/collaborations/${project.id}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Request sent',
        description: 'We notified the project owner to publish a budget range.',
      });
    } catch (error: any) {
      console.error('Budget reminder failed', error);
      toast({
        title: 'Unable to send request',
        description: error?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setBudgetReminderId(null);
    }
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
            {collaborations.map((collab) => {
              const budgetEstimate = estimateBudgetForProject(budgetBenchmarks, collab);
              const isOwner = user?.id === collab.user_id;

              return (
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

                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-1 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4 mt-0.5" />
                      <div>
                        {collab.budget_range ? (
                          <span className="text-foreground font-medium">{collab.budget_range}</span>
                        ) : (
                          <>
                            <span>
                              {budgetEstimate ? `Estimated ${budgetEstimate}` : 'Budget pending'}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {budgetEstimate && (
                                <Badge variant="outline" className="text-xs">
                                  Est. {budgetEstimate}
                                </Badge>
                              )}
                              {isOwner ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openBudgetDialog(collab)}
                                >
                                  Set budget
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBudgetReminder(collab)}
                                  disabled={budgetReminderId === collab.id}
                                >
                                  {budgetReminderId === collab.id ? 'Notifying…' : 'Request update'}
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
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
            );
            })}
          </div>
        )}
      </div>
      <Dialog open={Boolean(editingProject)} onOpenChange={(open) => {
        if (!open) {
          setEditingProject(null);
          setBudgetInput('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set project budget</DialogTitle>
            <DialogDescription>
              Share a clear range so collaborators know what to expect. You can adjust this at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder="e.g. £150 – £300"
            />
            {editingProject && (
              <p className="text-xs text-muted-foreground">
                Suggested: {estimateBudgetForProject(budgetBenchmarks, editingProject) ?? 'Add the range that fits your project'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditingProject(null);
                setBudgetInput('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveBudgetRange} disabled={savingBudget}>
              {savingBudget ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save budget'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ActiveCollaborations;