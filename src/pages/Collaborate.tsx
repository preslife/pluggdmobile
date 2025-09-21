import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFilters } from "@/components/ProjectFilters";
import { ProjectDetailModal } from "@/components/ProjectDetailModal";
import ProjectSubmissionForm from "@/components/ProjectSubmissionForm";
import { useCollaboration, CollaborationProject, ProjectApplication } from "@/hooks/useCollaboration";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { setMeta } from "@/lib/seo";

const Collaborate = () => {
  console.log('Collaborate component rendering - start');
  
  try {
    const { toast } = useToast();
    const { 
      projects, 
      loading, 
      error, 
      fetchProjects, 
      applyToProject, 
      getUserProjects,
      getUserApplications 
    } = useCollaboration();
    console.log('Hooks loaded successfully');
    
    useEffect(() => {
      setMeta(
        "Pluggd Collaborate — Find Creators & Projects",
        "Find collaborators and projects on Pluggd.",
        "/collaborate"
      );
    }, []);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<CollaborationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CollaborationProject | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [myProjects, setMyProjects] = useState<CollaborationProject[]>([]);
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);
  
  // Form state for project submission
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    skills: "",
    budget: "",
    deadline: ""
  });

  // Filter projects based on search and filters
  const applyFilters = () => {
    let filtered = projects;
    
    if (searchQuery) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedGenre && selectedGenre !== "all") {
      filtered = filtered.filter(project => 
        project.genre.toLowerCase() === selectedGenre.toLowerCase()
      );
    }
    
    if (selectedSkill && selectedSkill !== "all") {
      filtered = filtered.filter(project => 
        project.skills_needed.some(skill => skill.toLowerCase() === selectedSkill.toLowerCase())
      );
    }
    
    setFilteredProjects(filtered);
    toast({
      title: "Filters Applied",
      description: `Found ${filtered.length} matching projects`,
    });
  };

  // Apply filters whenever projects or filter values change
  useEffect(() => {
    applyFilters();
  }, [projects, searchQuery, selectedGenre, selectedSkill]);

  // Load user's projects for "My Projects" tab
  const loadMyProjects = async () => {
    const userProjects = await getUserProjects();
    setMyProjects(userProjects);
  };

  const loadMyApplications = async () => {
    const apps = await getUserApplications();
    setMyApplications(apps as any);
  };

  useEffect(() => {
    loadMyProjects();
    loadMyApplications();
  }, []);

  const handleOpenDetail = (project: CollaborationProject) => {
    console.log('Collaborate handleOpenDetail called with:', project);
    console.log('Current modal state before:', { selectedProject, isDetailModalOpen });
    setSelectedProject(project);
    setIsDetailModalOpen(true);
    console.log('Modal state after setting:', { selectedProject: project, isDetailModalOpen: true });
  };

  const handleCloseDetail = () => {
    setSelectedProject(null);
    setIsDetailModalOpen(false);
  };

  const handleApply = async (projectId: string, message?: string) => {
    return await applyToProject(projectId, message);
  };

  const handleMessage = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      window.dispatchEvent(new CustomEvent('open-message', { detail: { userId: proj.user_id, projectId } }));
    } else {
      toast({ title: "Opening messages", description: "Starting a conversation..." });
      window.dispatchEvent(new CustomEvent('open-message', {}));
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle project submission
  const handleSubmitProject = () => {
    if (!formData.title || !formData.description || !formData.genre) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Project Submitted!",
      description: "Your collaboration project has been submitted and is pending review.",
    });
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      genre: "",
      skills: "",
      budget: "",
      deadline: ""
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenre("all");
    setSelectedSkill("all");
    setFilteredProjects(projects);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  console.log('About to render Collaborate component');
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative text-center mb-12 py-16 rounded-2xl overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
            style={{ backgroundImage: 'url(/lovable-uploads/b19f0151-b9ac-41fa-b010-ed59a5b085ef.png)' }}
          ></div>
          
          {/* Background Overlay */}
          <div className="absolute inset-0 bg-background/60"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">FYBY</span>
              {" "}
              <span className="text-foreground">Collaboration Hub</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Find Your Beat, Find Your Voice - Connect with artists and producers for your next collaboration
            </p>
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 max-w-xl mx-auto">
            <TabsTrigger value="browse">Browse Projects</TabsTrigger>
            <TabsTrigger value="submit">Submit Project</TabsTrigger>
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="my-applications">My Applications</TabsTrigger>
          </TabsList>

          {/* Browse Projects Tab */}
          <TabsContent value="browse" className="space-y-6">
            <ProjectFilters
              searchQuery={searchQuery}
              selectedGenre={selectedGenre}
              selectedSkill={selectedSkill}
              onSearchChange={setSearchQuery}
              onGenreChange={setSelectedGenre}
              onSkillChange={setSelectedSkill}
              onApplyFilters={applyFilters}
            />

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                console.log('Rendering project:', project);
                return (
                  <ProjectCard 
                    key={project.id} 
                    project={project}
                    onOpenDetail={handleOpenDetail}
                    onApply={handleApply}
                    onMessage={handleMessage}
                  />
                );
              })}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters or search terms.
                </p>
                <Button variant="hero" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="submit" className="space-y-6">
            <ProjectSubmissionForm />
          </TabsContent>

          {/* My Projects Tab */}
          <TabsContent value="my-projects" className="space-y-6">
            {myProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project}
                    onOpenDetail={handleOpenDetail}
                    onApply={handleApply}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't submitted any collaboration projects yet.
                </p>
                <Button 
                  variant="hero"
                  onClick={() => {
                    // Switch to submit tab
                    const submitTab = document.querySelector('[value="submit"]') as HTMLElement;
                    submitTab?.click();
                  }}
                >
                  Submit Your First Project
                </Button>
              </div>
            )}
          </TabsContent>
        <TabsContent value="my-applications" className="space-y-6">
          {myApplications.length > 0 ? (
            <div className="space-y-4">
              {myApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">
                      {(app.collaboration_projects && app.collaboration_projects.title) || 'Project'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Status: {(app.collaboration_projects && app.collaboration_projects.status) || app.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const proj = projects.find(p => p.id === app.project_id);
                        if (proj) handleOpenDetail(proj);
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      variant="hero"
                      onClick={() => handleMessage(app.project_id)}
                    >
                      Message Owner
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground">
                Apply to projects to see them here.
              </p>
            </div>
          )}
        </TabsContent>

        </Tabs>

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          onApply={handleApply}
          onMessage={handleMessage}
        />
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error in Collaborate component:', error);
    return <div className="min-h-screen bg-background flex items-center justify-center text-white">Error loading page</div>;
  }
};

export default Collaborate;