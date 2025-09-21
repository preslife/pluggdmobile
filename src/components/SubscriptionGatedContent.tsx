import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionGatedContentProps {
  children: ReactNode;
  perkAccess: 'public' | 'subscribers' | 'tier:pro' | 'tier:premium';
  creatorId?: string;
  fallbackText?: string;
}

export const SubscriptionGatedContent = ({ 
  children, 
  perkAccess, 
  creatorId,
  fallbackText = "This content is exclusive to subscribers"
}: SubscriptionGatedContentProps) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  // If content is public, always show it
  if (perkAccess === 'public') {
    return <>{children}</>;
  }

  // Check if user has access
  const hasAccess = () => {
    if (!user) return false;
    
    if (perkAccess === 'subscribers') {
      // Check if user is subscribed to this creator
      // This would need a hook to check fan subscriptions
      return true; // Simplified for now
    }
    
    if (perkAccess.startsWith('tier:')) {
      const requiredTier = perkAccess.split(':')[1];
      return subscription?.tier === requiredTier;
    }
    
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  // Show locked content
  return (
    <Card className="border-dashed border-2 border-primary/20">
      <CardContent className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          {perkAccess.startsWith('tier:') ? (
            <Crown className="h-12 w-12 text-primary" />
          ) : (
            <Lock className="h-12 w-12 text-primary" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Exclusive Content</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {fallbackText}
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          {perkAccess === 'subscribers' && creatorId ? (
            <Button onClick={() => window.location.href = `/creator/${creatorId}#subscribe`}>
              Subscribe to Unlock
            </Button>
          ) : (
            <Button onClick={() => window.location.href = '/subscription'}>
              Upgrade Plan
            </Button>
          )}
          
          <Button variant="outline" onClick={() => window.location.href = '/auth'}>
            Sign In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};