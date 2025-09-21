import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, GraduationCap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface CourseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    oneTimePrice?: number;
  };
  onPurchaseComplete: () => void;
}

export function CourseUpgradeModal({ 
  isOpen, 
  onClose, 
  course,
  onPurchaseComplete 
}: CourseUpgradeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgradeToPro = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { 
          tier: 'pro',
          billing_cycle: 'monthly'
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error upgrading to Pro:', error);
      toast({
        title: "Upgrade Error",
        description: "Failed to start upgrade process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOneTimePurchase = async () => {
    if (!user || !course.oneTimePrice) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-course-payment', {
        body: { 
          courseId: course.id,
          amount: course.oneTimePrice * 100 // Convert to cents
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onPurchaseComplete();
      }
    } catch (error) {
      console.error('Error purchasing course:', error);
      toast({
        title: "Purchase Error", 
        description: "Failed to start purchase process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            This course is Pro-Only
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
            <p className="text-muted-foreground text-sm">
              Choose how you'd like to access this course:
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleUpgradeToPro}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro - £24.99/month
              <Badge variant="secondary" className="ml-2">Best Value</Badge>
            </Button>

            {course.oneTimePrice && (
              <Button 
                onClick={handleOneTimePurchase}
                disabled={loading}
                variant="outline"
                className="w-full border-purple-200 hover:bg-purple-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                Unlock this course forever - £{course.oneTimePrice}
              </Button>
            )}
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              Pro Benefits:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                Unlimited active courses
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                Full analytics dashboard
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                Featured listings
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                Early access to new tools
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                Priority support
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            One-time course purchases give lifetime access to that course only (no Pro features)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}