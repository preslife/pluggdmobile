import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, CheckCircle, User } from "lucide-react";
import { FavNicknameSelector } from "./FavNicknameSelector";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserFavNickname {
  nickname: string;
  custom_icon: string;
  display_order: number;
}

interface FavNicknamesFirstRunProps {
  onComplete: () => void;
}

export const FavNicknamesFirstRun = ({ onComplete }: FavNicknamesFirstRunProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'selection' | 'complete'>('intro');
  const [selectedNicknames, setSelectedNicknames] = useState<UserFavNickname[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if user has already completed FAV nicknames setup
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('fav_nicknames_setup_completed')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data?.fav_nicknames_setup_completed) {
          // User has already completed setup, skip this flow
          onComplete();
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      }
    };

    checkSetupStatus();
  }, [user, onComplete]);

  const handleStartSelection = () => {
    setStep('selection');
  };

  const handleSelectionComplete = (nicknames: UserFavNickname[]) => {
    setSelectedNicknames(nicknames);
    setStep('complete');
    
    // Auto-complete after a brief delay to show the success state
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleSkip = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mark setup as completed without selecting nicknames
      const { error } = await supabase
        .from('profiles')
        .update({ fav_nicknames_setup_completed: true })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Setup completed",
        description: "You can set up FAV nicknames later in your profile settings",
      });

      onComplete();
    } catch (error) {
      console.error('Error skipping setup:', error);
      toast({
        title: "Error",
        description: "Failed to skip setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case 'intro': return 0;
      case 'selection': return 50;
      case 'complete': return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Progress Bar */}
        <div className="text-center space-y-2">
          <Progress value={getStepProgress()} className="w-full max-w-md mx-auto" />
          <p className="text-sm text-muted-foreground">
            Step {step === 'intro' ? '1' : step === 'selection' ? '2' : '3'} of 3
          </p>
        </div>

        {/* Step Content */}
        {step === 'intro' && (
          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                        ✨
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Welcome to FAV Nicknames!
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Personalize your Pluggd experience with custom nicknames
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 py-6">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Express Yourself</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose nicknames that reflect your musical identity and style
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">Stand Out</h3>
                  <p className="text-sm text-muted-foreground">
                    Your FAV nicknames will be displayed throughout the platform
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Easy Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    Select up to 3 nicknames from our suggestions or create your own
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  onClick={handleStartSelection}
                  className="min-w-[200px] h-12 text-lg"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={handleSkip}
                    disabled={loading}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {loading ? 'Skipping...' : 'Skip for now'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                You can always change your FAV nicknames later in your profile settings
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'selection' && (
          <div className="space-y-6">
            <FavNicknameSelector
              onComplete={handleSelectionComplete}
              showTitle={false}
              maxSelections={3}
              mode="first-run"
            />
            
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground"
              >
                {loading ? 'Skipping...' : 'Skip this step'}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <Card className="border-2 border-green-200 shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-green-600">
                    Perfect! You're All Set! 🎉
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Your FAV nicknames have been saved
                  </p>
                </div>
              </div>

              {selectedNicknames.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Your Selected FAV Nicknames:</h3>
                  <div className="flex justify-center flex-wrap gap-2">
                    {selectedNicknames.map((nickname, index) => (
                      <div
                        key={index}
                        className={`px-4 py-2 rounded-full ${
                          index === 0 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {nickname.custom_icon} {nickname.nickname}
                        {index === 0 && <span className="ml-1 text-xs opacity-75">(Primary)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-lg text-muted-foreground animate-pulse">
                Redirecting you to your dashboard...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FavNicknamesFirstRun;