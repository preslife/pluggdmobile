import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedBadgeProps {
  verified?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function EnhancedBadge({ verified, children, className, variant = "default" }: EnhancedBadgeProps) {
  return (
    <div className="flex items-center gap-1">
      <Badge variant={variant} className={cn(className)}>
        {children}
      </Badge>
      {verified && (
        <CheckCircle className="h-4 w-4 text-primary" aria-label="Verified creator" />
      )}
    </div>
  );
}