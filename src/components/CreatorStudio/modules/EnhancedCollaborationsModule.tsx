import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCollaboration, type CollaborationProject } from '@/hooks/useCollaboration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  X,
  MessageSquare,
  Star,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import ProjectSubmissionForm from '@/components/ProjectSubmissionForm';

/**
 * EnhancedCollaborationsModule - Connects to existing collaboration system
 * Replaces placeholder with real collaboration functionality
 */
export const EnhancedCollaborationsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    projects,
    loading,
    fetchProjects,
    createProject,
    applyToProject,
    getUserProjects,
    getUserApplications,
    updateProjectBudget
  } = useCollaboration();

  const [myProjects, setMyProjects] = useState<CollaborationProject[]>([]);
  const [myApplications, setMyApplications] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [savingBudgetFor, setSavingBudgetFor] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    await fetchProjects();
    const userProjects = await getUserProjects();
    const userApplications = await getUserApplications();

    setMyProjects((userProjects || []) as CollaborationProject[]);
    setMyApplications(userApplications || []);
  };

  useEffect(() => {
    setBudgetInputs(prev => {
      const next = { ...prev };
      const activeIds = new Set<string>();

      myProjects.forEach(project => {
        if (!project.budget_range) {
          activeIds.add(project.id);
          if (!(project.id in next)) {
            next[project.id] = '';
          }
        }
      });

      Object.keys(next).forEach(projectId => {
        if (!activeIds.has(projectId)) {
          delete next[projectId];
        }
      });

      return next;
    });
  }, [myProjects]);

  const missingBudgetCount = useMemo(
    () => myProjects.filter(project => !project.budget_range).length,
    [myProjects]
  );

  const budgetSuggestions = useMemo(() => {
    const suggestions: Record<string, string> = {};
    const referenceProjects = [...projects, ...myProjects].filter(
      (project): project is CollaborationProject => Boolean(project?.budget_range)
    );

    const budgetsByGenre = referenceProjects.reduce<Record<string, string[]>>((acc, project) => {
      if (!project.genre || !project.budget_range) return acc;
      if (!acc[project.genre]) {
        acc[project.genre] = [];
      }
      acc[project.genre].push(project.budget_range);
      return acc;
    }, {});

    const fallbackBudget = referenceProjects[0]?.budget_range || "£250-500";

    myProjects.forEach(project => {
      if (!project.budget_range) {
        const genreSuggestion = project.genre ? budgetsByGenre[project.genre]?.[0] : undefined;
        const suggestion = genreSuggestion || fallbackBudget;
        if (suggestion) {
          suggestions[project.id] = suggestion;
        }
      }
    });

    return suggestions;
  }, [myProjects, projects]);

  const handleBudgetInputChange = (projectId: string, value: string) => {
    setBudgetInputs(prev => ({
      ...prev,
      [projectId]: value
    }));
  };

  const handleUseSuggestedBudget = (projectId: string) => {
    const suggestion = budgetSuggestions[projectId];
    if (suggestion) {
      setBudgetInputs(prev => ({
        ...prev,
        [projectId]: suggestion
      }));
    }
  };

  const handleSaveBudget = async (projectId: string) => {
    const value = (budgetInputs[projectId] ?? budgetSuggestions[projectId] ?? "").trim();

    if (!value) {
      toast({
        title: "Budget required",
        description: "Please provide a budget range before saving.",
        variant: "destructive"
      });
      return;
    }

    setSavingBudgetFor(projectId);

    try {
      const success = await updateProjectBudget(projectId, value);

      if (success) {
        await fetchData();
        setBudgetInputs(prev => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    } finally {
      setSavingBudgetFor(null);
    }
  };

  const handleCreateProject = async (projectData: any) => {
    const result = await createProject(projectData);
    if (result) {
      setShowCreateForm(false);
      fetchData();
      setActiveTab('my-projects');
    }
  };

  const handleApply = async (projectId: string, message: string) => {
    const success = await applyToProject(projectId, message);
    if (success) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Collaborations & Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-secondary rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-secondary rounded" />
                  <div className="h-3 bg-secondary rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Collaborations & Projects</h1>
          <p className="text-muted-foreground">Find creators to collaborate with or post your own projects</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myProjects.length}</div>
            <p className="text-xs text-muted-foreground">Projects you've posted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myApplications.length}</div>
            <p className="text-xs text-muted-foreground">Projects you've applied to</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Available to apply</p>
          </CardContent>
        </Card>
        <Card className={missingBudgetCount > 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-900/20' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budgets Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {missingBudgetCount}
            </div>
            <p className="text-xs text-muted-foreground">Projects missing a budget range</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Browse Projects</TabsTrigger>
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Collaboration Projects</CardTitle>
              <CardDescription>Find projects that match your skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project: any) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <Badge variant={project.budget_range ? 'default' : 'secondary'}>
                          {project.budget_range || 'Negotiable'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {project.skills_needed?.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {project.applications_count || 0} applied
                        </span>
                      </div>
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => handleApply(project.id, '')}
                      >
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {projects.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No open projects at the moment</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowCreateForm(true)}>
                    Post the First Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Posted Projects</CardTitle>
              <CardDescription>Manage projects you've created</CardDescription>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You haven't posted any projects yet</p>
                  <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{project.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        </div>
                        <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {project.applications_count || 0} applicants
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-4 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {project.budget_range ? (
                          <span className="font-medium">{project.budget_range}</span>
                        ) : (
                          <span className="italic text-muted-foreground">Budget range not set</span>
                        )}
                      </div>
                      {!project.budget_range && (
                        <div
                          data-testid={`budget-prompt-${project.id}`}
                          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-900/20"
                        >
                          <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <div className="space-y-2">
                              <div className="text-sm font-medium">Budget range needed</div>
                              <p className="text-xs text-muted-foreground">
                                Add a budget range so collaborators understand compensation expectations. We'll
                                suggest a range based on similar projects if you're unsure.
                              </p>
                              <Input
                                value={budgetInputs[project.id] ?? ""}
                                onChange={(e) => handleBudgetInputChange(project.id, e.target.value)}
                                placeholder={budgetSuggestions[project.id] || "e.g., £250-500"}
                              />
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleUseSuggestedBudget(project.id)}
                                  disabled={!budgetSuggestions[project.id]}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Use suggested range
                                  {budgetSuggestions[project.id] ? ` (${budgetSuggestions[project.id]})` : ''}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleSaveBudget(project.id)}
                                  disabled={savingBudgetFor === project.id}
                                >
                                  {savingBudgetFor === project.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Save budget
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline">View Applicants</Button>
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="outline" className="text-red-500">Close Project</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Applications</CardTitle>
              <CardDescription>Track projects you've applied to</CardDescription>
            </CardHeader>
            <CardContent>
              {myApplications.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You haven't applied to any projects yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('browse')}>
                    Browse Projects
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myApplications.map((application: any) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{application.project_title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{application.message}</p>
                        </div>
                        <Badge variant={
                          application.status === 'accepted' ? 'default' : 
                          application.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }>
                          {application.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Applied {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collaboration Invitations</CardTitle>
              <CardDescription>Invites from other creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending invitations</p>
                <p className="text-sm text-muted-foreground mt-2">
                  When creators invite you to collaborate, they'll appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Project Modal/Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Create New Project</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ProjectSubmissionForm 
              onSubmit={handleCreateProject}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCollaborationsModule;
