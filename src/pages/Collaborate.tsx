import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Handshake, Search, PlusCircle, FileText, Sparkles, Music, Mic, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFilters } from "@/components/ProjectFilters";
import { ProjectDetailModal } from "@/components/ProjectDetailModal";
import ProjectSubmissionForm from "@/components/ProjectSubmissionForm";
import { useCollaboration, CollaborationProject, ProjectApplication } from "@/hooks/useCollaboration";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { setMeta } from "@/lib/seo";

const Collaborate = () => {
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
    setSelectedProject(project);
    setIsDetailModalOpen(true);
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
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.1),transparent_50%)]" />
        
        <div className="relative z-10 container mx-auto px-4 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <Handshake className="w-3 h-3 mr-1" />
              Find Your People
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Collaboration <span className="text-emerald-500">Hub</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Find your beat, find your voice. Connect with artists, producers, and creators 
              for your next project. Post briefs, discover talent, and make music together.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { icon: Music, label: "Producers", color: "text-emerald-400" },
                { icon: Mic, label: "Vocalists", color: "text-teal-400" },
                { icon: Palette, label: "Mix Engineers", color: "text-cyan-400" },
                { icon: Sparkles, label: "Songwriters", color: "text-green-400" },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-zinc-300">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto"
          >
            {[
              { icon: Search, title: "Find Collaborators", desc: "Browse hundreds of open projects", color: "from-emerald-500/20 to-teal-500/10" },
              { icon: PlusCircle, title: "Post Your Brief", desc: "Describe what you need and get applications", color: "from-teal-500/20 to-cyan-500/10" },
              { icon: FileText, title: "Apply & Connect", desc: "Send your pitch and start creating", color: "from-cyan-500/20 to-green-500/10" },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-sm`}
              >
                <card.icon className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-zinc-400">{card.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Tabs defaultValue="browse" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 w-full max-w-2xl mx-auto grid grid-cols-4">
            <TabsTrigger value="browse" className="data-[state=active]:bg-background">
              <Search className="w-4 h-4 mr-2 hidden sm:inline" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="submit" className="data-[state=active]:bg-background">
              <PlusCircle className="w-4 h-4 mr-2 hidden sm:inline" />
              Submit
            </TabsTrigger>
            <TabsTrigger value="my-projects" className="data-[state=active]:bg-background">
              <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
              My Projects
            </TabsTrigger>
            <TabsTrigger value="my-applications" className="data-[state=active]:bg-background">
              <Users className="w-4 h-4 mr-2 hidden sm:inline" />
              Applications
            </TabsTrigger>
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
              {filteredProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onOpenDetail={handleOpenDetail}
                  onApply={handleApply}
                  onMessage={handleMessage}
                />
              ))}
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
};

export default Collaborate;