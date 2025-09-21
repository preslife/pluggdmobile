import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Heart, Calendar, DollarSign, User, Clock } from "lucide-react";
import { CollaborationProject } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCollaboration } from "@/hooks/useCollaboration";

interface ProjectDetailModalProps {
  project: CollaborationProject | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (projectId: string, message?: string) => Promise<boolean>;
  onMessage: (projectId: string) => void;
}

export const ProjectDetailModal = ({ 
  project, 
  isOpen, 
  onClose, 
  onApply, 
  onMessage 
}: ProjectDetailModalProps) => {
  const [applicationMessage, setApplicationMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const { user } = useAuth();
  const { hasUserApplied } = useCollaboration({ autoFetch: false });
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (project && user) {
        const has = await hasUserApplied(project.id);
        if (mounted) setApplied(has);
      } else {
        setApplied(false);
      }
    })();
    return () => { mounted = false; };
  }, [project?.id, user?.id, hasUserApplied]);

  if (!project) return null;

  const handleApply = async () => {
    if (!project) return;
    if ((user?.id === project.user_id) || applied) return;
    setIsApplying(true);
    const success = await onApply(project.id, applicationMessage);
    if (success) {
      setApplicationMessage("");
      setApplied(true);
      onClose();
    }
    setIsApplying(false);
  };

  const handleMessage = () => {
    onMessage(project.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{project.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Project Owner</h3>
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

          {/* Skills and Genre */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{project.genre}</Badge>
            {project.skills_needed.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Project Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Requirements */}
          {project.requirements && (
            <div>
              <h3 className="font-semibold mb-2">Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                {project.requirements}
              </p>
            </div>
          )}

          <Separator />

          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.budget_range && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-sm text-muted-foreground">Budget:</span>
                  <p className="font-medium text-primary">{project.budget_range}</p>
                </div>
              </div>
            )}

            {project.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <div>
                  <span className="text-sm text-muted-foreground">Deadline:</span>
                  <p className="font-medium">{format(new Date(project.deadline), 'PPP')}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" />
              <div>
                <span className="text-sm text-muted-foreground">Votes:</span>
                <p className="font-medium">{project.votes}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Posted:</span>
                <p className="font-medium">{format(new Date(project.created_at), 'PPP')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Application Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Apply to this Project</h3>
            <Textarea
              placeholder="Write a message to introduce yourself and explain why you'd be perfect for this project..."
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              className="min-h-[100px]"
            />
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline"
                onClick={handleMessage}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message Owner
              </Button>
              <Button 
                variant="hero"
                onClick={handleApply}
                disabled={isApplying || (user?.id === project.user_id) || applied}
                className="flex items-center gap-2"
              >
                {isApplying ? "Applying..." : (user?.id === project.user_id) ? "Your Project" : applied ? "Applied" : "Apply Now"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};