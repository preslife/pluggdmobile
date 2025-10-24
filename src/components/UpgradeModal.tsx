import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { SubscriptionTier } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useLogger } from "@/hooks/useLogger";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  feature?: string;
  course?: {
    id: string;
    title: string;
    oneTimePrice?: number;
  };
}

const tierInfo = {
  creator: {
    name: "Creator",
    price: "£9.99",
    icon: Star,
    color: "text-primary",
    bgColor: "bg-card",
    features: [
      "3 active courses",
      "15 beats per month",
      "Sell sample packs",
      "Post collaboration projects",
      "Host events",
      "Submit challenges",
      "Analytics dashboard",
      "Directory profile",
      "Verified badge"
    ]
  },
  pro: {
    name: "Pro", 
    price: "£24.99",
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-card",
    features: [
      "Unlimited courses",
      "Unlimited beats",
      "All license types",
      "Featured listings",
      "Full analytics + export",
      "Sync licensing",
      "Private collaborations",
      "Availability calendar",
      "Contact forms",
      "Early access to tools"
    ]
  }
};

export const UpgradeModal = ({
  isOpen,
  onClose,
  currentTier,
  requiredTier,
  feature,
  course
}: UpgradeModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const baseMetadata = useMemo(
    () => ({
      current_tier: currentTier,
      required_tier: requiredTier ?? null,
      course_id: course?.id ?? null,
    }),
    [course?.id, currentTier, requiredTier]
  );
  const { logEvent, logError, correlationId } = useLogger({
    component: "UpgradeModal",
    feature: "billing",
    metadata: baseMetadata,
  });

  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      await logEvent("upgrade_modal_checkout_start", {
        ...baseMetadata,
        tier,
      });
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, correlationId },
        headers: { "x-correlation-id": correlationId },
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      const checkoutUrl = (data as { url?: string } | null)?.url;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
      }
      await logEvent("upgrade_modal_checkout_success", {
        ...baseMetadata,
        tier,
        has_checkout_url: Boolean(checkoutUrl),
      });
      onClose();
    } catch (error) {
      void logError("upgrade_modal_checkout_error", error, {
        ...baseMetadata,
        tier,
      });
      toast({
        title: "Error",
        description: "Failed to start checkout process.",
        variant: "destructive"
      });
    }
  };

  const handleOneTimePurchase = async () => {
    if (!course) return;

    setIsLoading(true);
    let amountMinor: number | null = null;
    try {
      amountMinor = course.oneTimePrice ? Math.round(course.oneTimePrice * 100) : null;
      if (!amountMinor) {
        void logError("upgrade_modal_course_purchase_error", new Error("invalid_course_price"), {
          ...baseMetadata,
          course_id: course.id,
        });
        toast({
          title: "Unavailable",
          description: "This course is not currently available for one-time purchase.",
          variant: "destructive",
        });
        return;
      }
      await logEvent("upgrade_modal_one_time_purchase_start", {
        ...baseMetadata,
        course_id: course.id,
        amount_minor: amountMinor,
      });
      const { data, error } = await supabase.functions.invoke('create-course-payment', {
        body: {
          courseId: course.id,
          amount: amountMinor,
          correlationId,
        },
        headers: { "x-correlation-id": correlationId },
      });

      if (error) throw error;

      const checkoutUrl = (data as { url?: string } | null)?.url;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        await logEvent("upgrade_modal_one_time_purchase_success", {
          ...baseMetadata,
          course_id: course.id,
          amount_minor: amountMinor,
          has_checkout_url: true,
        });
        onClose();
      }
    } catch (error) {
      void logError("upgrade_modal_course_purchase_error", error, {
        ...baseMetadata,
        course_id: course.id,
        amount_minor: amountMinor ?? undefined,
      });
      toast({
        title: "Error",
        description: "Failed to start course purchase.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (course) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Crown className="h-5 w-5 text-primary" />
              This course is Pro-Only
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2 text-foreground">{course.title}</h3>
              <p className="text-muted-foreground text-sm">
                Choose how you'd like to access this course:
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleUpgrade('pro')}
                className="w-full"
                variant="default"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro - £24.99/month
                <Badge variant="secondary" className="ml-2">Best Value</Badge>
              </Button>

              {course.oneTimePrice && (
                <Button 
                  onClick={handleOneTimePurchase}
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Unlock this course forever - £{course.oneTimePrice}
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center">
              One-time course purchases give lifetime access to that course only (no Pro features)
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If a specific tier is required, show only that tier
  if (requiredTier) {
    const info = tierInfo[requiredTier];
    const Icon = info.icon;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg bg-background border">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">
              Upgrade Required
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {feature && (
              <div className="text-center">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{feature}</strong> is only available for {info.name} subscribers
                </p>
              </div>
            )}

            <div className={`${info.bgColor} rounded-lg p-6 text-center border`}>
              <Icon className={`h-12 w-12 ${info.color} mx-auto mb-4`} />
              <h3 className="text-2xl font-bold mb-2 text-foreground">{info.name}</h3>
              <div className="text-3xl font-bold mb-4 text-foreground">
                {info.price}<span className="text-base font-normal text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-2 text-sm text-left">
                {info.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => handleUpgrade(requiredTier)}
                className="flex-1"
              >
                Upgrade to {info.name}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Maybe Later
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Save 2 months with annual billing
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show both tiers when no specific tier is required
  const availableTiers = currentTier === 'free' ? ['creator', 'pro'] : ['pro'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {availableTiers.map((tier) => {
            const info = tierInfo[tier as keyof typeof tierInfo];
            const Icon = info.icon;
            
            return (
              <div key={tier} className={`${info.bgColor} rounded-lg p-6 border`}>
                <div className="text-center mb-4">
                  <Icon className={`h-10 w-10 ${info.color} mx-auto mb-3`} />
                  <h3 className="text-xl font-bold text-foreground">{info.name}</h3>
                  <div className="text-2xl font-bold text-foreground">
                    {info.price}<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-2 text-sm mb-6">
                  {info.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleUpgrade(tier as SubscriptionTier)}
                  className="w-full"
                  variant={tier === 'pro' ? 'default' : 'outline'}
                >
                  Choose {info.name}
                  {tier === 'pro' && <Badge variant="secondary" className="ml-2">Most Popular</Badge>}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={onClose}>
            Maybe Later
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Save 2 months with annual billing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};