import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Upload, 
  BarChart3, 
  DollarSign, 
  Users, 
  Radio,
  GraduationCap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WELCOME_STORAGE_KEY = 'pluggd-creator-welcome-shown';

interface CreatorWelcomeProps {
  onClose?: () => void;
}

export const CreatorWelcome = ({ onClose }: CreatorWelcomeProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    checkShouldShow();
  }, [user]);

  const checkShouldShow = async () => {
    if (!user) return;

    // Check if already shown
    const shown = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (shown === user.id) return;

    // Check if this is a creator's first time in studio
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_creator, user_type, created_at')
        .eq('user_id', user.id)
        .single();

      if (profile?.is_creator || profile?.user_type === 'producer') {
        // Check if account is less than 7 days old
        const createdAt = new Date(profile.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (createdAt > weekAgo) {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error checking creator status:', error);
    }
  };

  const handleClose = () => {
    if (user) {
      localStorage.setItem(WELCOME_STORAGE_KEY, user.id);
    }
    setOpen(false);
    onClose?.();
  };

  const handleGetStarted = () => {
    handleClose();
    navigate('/studio/catalog');
  };

  const features = [
    {
      icon: Upload,
      title: 'Upload Your Music',
      description: 'Releases, beats, and sample packs with customizable licensing',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      icon: BarChart3,
      title: 'Track Performance',
      description: 'Real-time analytics on plays, sales, and audience growth',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      icon: DollarSign,
      title: 'Get Paid',
      description: 'Keep 90% of your earnings with direct Stripe payouts',
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      icon: Users,
      title: 'Build Community',
      description: 'Memberships, fan interactions, and exclusive content',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      icon: Radio,
      title: 'Go Live',
      description: 'Host live sessions, workshops, and ticketed events',
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      icon: GraduationCap,
      title: 'Teach & Learn',
      description: 'Create courses and learn from other creators',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10'
    }
  ];

  const quickStartSteps = [
    'Complete your profile with bio and social links',
    'Connect your Stripe account to receive payments',
    'Upload your first beat or release',
    'Set up membership tiers for your superfans'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-purple-500/10 to-background p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Welcome
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold">
              Welcome to Creator Studio! 🎉
            </DialogTitle>
            <p className="text-muted-foreground mt-2">
              Your all-in-one platform for creating, monetizing, and growing your music career.
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2">
          {step === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Feature Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className={`w-8 h-8 rounded-lg ${feature.bg} flex items-center justify-center mb-2`}>
                      <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    </div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={handleClose}>
                  Skip for now
                </Button>
                <Button onClick={() => setStep(1)}>
                  Show me how to start
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Quick Start Steps */}
              <h3 className="font-semibold mb-4">Quick Start Guide</h3>
              <div className="space-y-3 mb-6">
                {quickStartSteps.map((stepText, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm">{stepText}</p>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Pro Tip</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete all setup steps within your first week to unlock the "Early Adopter" badge and earn bonus credits!
                </p>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={handleGetStarted} className="bg-gradient-to-r from-primary to-purple-600">
                  Upload My First Track
                  <Upload className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatorWelcome;

