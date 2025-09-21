import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Heart, Eye } from "lucide-react";
import { CollaborationProject, useCollaboration } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProjectCardProps {
  project: CollaborationProject;
  onOpenDetail: (project: CollaborationProject) => void;
  onApply: (projectId: string, message?: string) => Promise<boolean>;
  onMessage: (projectId: string) => void;
}

export const ProjectCard = ({ project, onOpenDetail, onApply, onMessage }: ProjectCardProps) => {
  const { user } = useAuth();
  const { hasUserApplied } = useCollaboration({ autoFetch: false });
  const [applied, setApplied] = useState(false);
  const isOwner = user?.id === project.user_id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (user) {
        const has = await hasUserApplied(project.id);
        if (mounted) setApplied(has);
      } else {
        setApplied(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, project.id, hasUserApplied]);

  const handleApplyToProject = async () => {
    if (isOwner || applied) return;
    const ok = await onApply(project.id);
    if (ok) setApplied(true);
  };

  const handleMessageOwner = () => {
    onMessage(project.id);
  };
  const handleOpenDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Debug log removed for production
    onOpenDetail(project);
  };

  return (
    <Card className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
            <Link
              to={`/profile/${project.user_id}`}
              className="text-sm text-muted-foreground hover:underline"
              aria-label="View project owner's profile"
            >
              View owner profile
            </Link>
          </div>
          <Badge 
            variant={project.status === 'open' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{project.description}</p>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{project.genre}</Badge>
          {project.skills_needed.map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          {project.deadline && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deadline:</span>
              <span>{format(new Date(project.deadline), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {project.budget_range && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget:</span>
              <span className="text-primary font-medium">{project.budget_range}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent" />
            <span className="text-sm">{project.votes} votes</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleOpenDetail}
            >
              <Eye className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleMessageOwner}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Message
            </Button>
            <Button 
              size="sm" 
              variant="hero"
              onClick={handleApplyToProject}
              disabled={isOwner || applied}
            >
              {isOwner ? 'Your Project' : applied ? 'Applied' : 'Apply'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};