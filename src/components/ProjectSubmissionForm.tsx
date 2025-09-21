import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useCollaboration } from "@/hooks/useCollaboration";
import { PlusCircle, Crown } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

const ProjectSubmissionForm = () => {
  const { toast } = useToast();
  const { subscription, usage, incrementUsage } = useSubscription();
  const { createProject } = useCollaboration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "all",
    skills: "",
    budget: "",
    deadline: "",
    requirements: ""
  });

  // Check project posting limits
  const getTierLimits = () => {
    switch (subscription?.tier) {
      case 'free':
        return { monthly: 1 };
      case 'creator':
        return { monthly: 5 };
      case 'pro':
        return { monthly: -1 }; // unlimited
      default:
        return { monthly: 1 };
    }
  };

  const limits = getTierLimits();
  const canPost = limits.monthly === -1 || (usage?.projects_posted_month || 0) < limits.monthly;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canPost) {
      setShowUpgradeModal(true);
      return;
    }
    
    if (!formData.title || !formData.description || formData.genre === "all") {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    const projectData = {
      title: formData.title,
      description: formData.description,
      genre: formData.genre,
      skills_needed: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean),
      budget_range: formData.budget || undefined,
      deadline: formData.deadline || undefined,
      requirements: formData.requirements || undefined,
      status: 'open' as const
    };

    const result = await createProject(projectData);
    
    if (result) {
      // Increment usage count
      await incrementUsage('projects_posted_month');
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        genre: "all",
        skills: "",
        budget: "",
        deadline: "",
        requirements: ""
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      <Card className="bg-gradient-card border-border max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit New Collaboration Project</CardTitle>
          <p className="text-muted-foreground">
            Tell us about your project and what kind of collaborator you're looking for
          </p>
          
          {/* Usage Warning */}
          {!canPost && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Crown className="h-4 w-4 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Project posting limit reached</p>
                <p className="text-muted-foreground">
                  You've posted {usage?.projects_posted_month || 0}/{limits.monthly} projects this month. 
                  Upgrade to post more.
                </p>
              </div>
            </div>
          )}
          
          {/* Usage Info */}
          {canPost && limits.monthly !== -1 && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg">
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p>
                  {usage?.projects_posted_month || 0}/{limits.monthly} projects posted this month
                  {subscription?.tier === 'free' && ' • Upgrade for more projects'}
                </p>
              </div>
            </div>
          )}
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Need Vocalist for R&B Track"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your project, what you're looking for, and any specific requirements..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Genre *</Label>
              <Select value={formData.genre} onValueChange={(value) => handleInputChange("genre", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select a genre</SelectItem>
                  <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                  <SelectItem value="r&b">R&B</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="reggae">Reggae</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="skills">Skills Needed</Label>
              <Input
                id="skills"
                placeholder="e.g., Vocals, Guitar, Production (comma-separated)"
                value={formData.skills}
                onChange={(e) => handleInputChange("skills", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget Range</Label>
              <Input
                id="budget"
                placeholder="e.g., £500-1000"
                value={formData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange("deadline", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="requirements">Additional Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="Any specific requirements, experience level, or technical details..."
              value={formData.requirements}
              onChange={(e) => handleInputChange("requirements", e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            variant="hero" 
            disabled={isSubmitting || !canPost}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting..." : !canPost ? "Upgrade Required" : "Submit Project"}
          </Button>
        </form>
      </CardContent>
    </Card>

    <UpgradeModal 
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      feature="project posting"
      currentTier={subscription?.tier || 'free'}
    />
    </>
  );
};

export default ProjectSubmissionForm;