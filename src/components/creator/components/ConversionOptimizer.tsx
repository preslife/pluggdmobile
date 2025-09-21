import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  X,
  Mail,
  Heart,
  Gift,
  Bell,
  Percent,
  Star,
  Users,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface CreatorProfile {
  user_id: string;
  username: string;
  full_name: string;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
  visitCount: number;
}

interface ConversionOptimizerProps {
  profile: CreatorProfile;
  visitorStatus: VisitorStatus | null;
}

export const ConversionOptimizer = ({ profile, visitorStatus }: ConversionOptimizerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for different conversion elements
  const [showFollowDiscount, setShowFollowDiscount] = useState(false);
  const [showEmailOptIn, setShowEmailOptIn] = useState(false);
  const [showFirstTimeVisitor, setShowFirstTimeVisitor] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailOptInLoading, setEmailOptInLoading] = useState(false);
  const [emailOptedIn, setEmailOptedIn] = useState(false);

  useEffect(() => {
    determineConversionStrategy();
  }, [user, visitorStatus]);

  const determineConversionStrategy = () => {
    if (visitorStatus?.isOwner) return; // Don't show to owner

    // Show different conversion prompts based on visitor status
    if (!user) {
      // Anonymous visitor
      setShowFirstTimeVisitor(true);
      return;
    }

    // Logged in user strategies
    if (!visitorStatus?.isFollowing && (visitorStatus?.visitCount || 0) >= 2) {
      // Returning visitor who hasn't followed - show follow discount
      setShowFollowDiscount(true);
    }

    if (visitorStatus?.isFollowing && !visitorStatus?.isSubscribed) {
      // Follower who hasn't subscribed - show email opt-in
      setShowEmailOptIn(true);
    }
  };

  const handleFollowWithDiscount = async () => {
    if (!user) return;

    try {
      // Follow the creator
      await supabase.from('followers').insert({
        follower_id: user.id,
        following_id: profile.user_id
      });

      // Track the discount campaign
      await supabase.from('user_discounts').insert({
        user_id: user.id,
        creator_id: profile.user_id,
        discount_type: 'follow_discount',
        discount_percent: 10,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      toast({
        title: "Following + Discount Applied!",
        description: "You're now following this creator and have 10% off for 7 days!"
      });

      setShowFollowDiscount(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply follow discount",
        variant: "destructive"
      });
    }
  };

  const handleEmailOptIn = async () => {
    if (!emailInput.trim() || !user) return;

    setEmailOptInLoading(true);

    try {
      await supabase.from('creator_email_list').insert({
        creator_id: profile.user_id,
        subscriber_email: emailInput,
        subscriber_id: user.id,
        source: 'creator_page',
        tags: ['fan', 'creator_page_signup']
      });

      toast({
        title: "Subscribed!",
        description: "You'll get notified about new releases and exclusive content."
      });

      setEmailOptedIn(true);
      setShowEmailOptIn(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications",
        variant: "destructive"
      });
    } finally {
      setEmailOptInLoading(false);
    }
  };

  const dismissFirstTimeVisitor = () => {
    setShowFirstTimeVisitor(false);
  };

  return (
    <>
      {/* Follow Discount Nudge */}
      {showFollowDiscount && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <Card className="border-primary bg-gradient-to-r from-primary/5 to-accent/5 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <Badge variant="default" className="text-xs">
                    Limited Time
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFollowDiscount(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Save 10% when you follow!</h4>
                  <p className="text-xs text-muted-foreground">
                    Follow {profile.full_name || profile.username} and get 10% off all purchases for 7 days
                  </p>
                </div>

                <Button onClick={handleFollowWithDiscount} className="w-full" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Follow & Get 10% Off
                  <Percent className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Opt-in */}
      {showEmailOptIn && !emailOptedIn && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Stay Updated</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailOptIn(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Get notified about new releases, exclusive content, and live sessions
                </p>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="text-sm"
                    size={32}
                  />
                  <Button
                    onClick={handleEmailOptIn}
                    disabled={emailOptInLoading || !emailInput.trim()}
                    size="sm"
                  >
                    {emailOptInLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-1" />
                        Notify
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Opt-in Success */}
      {emailOptedIn && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm">
          <Card className="border-green-200 bg-green-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-800">
                  You're all set! Check your email for confirmation.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* First Time Visitor Welcome */}
      {showFirstTimeVisitor && (
        <div className="fixed top-20 right-4 z-50 max-w-sm">
          <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Welcome!</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissFirstTimeVisitor}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm">
                  Discover {profile.full_name || profile.username}'s music, courses, and exclusive content.
                </p>

                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href="#featured">
                      <Zap className="w-4 h-4 mr-2" />
                      Explore
                    </a>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <a href="/auth">
                      Sign Up
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Join thousands of fans supporting this creator
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Social Proof (for mobile) */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40 md:hidden">
        {visitorStatus?.isFollowing && !visitorStatus.isSubscribed && (
          <Badge variant="secondary" className="px-3 py-1 shadow-lg">
            <Users className="w-3 h-3 mr-1" />
            You're following • Subscribe for more!
          </Badge>
        )}
      </div>
    </>
  );
};

export default ConversionOptimizer;