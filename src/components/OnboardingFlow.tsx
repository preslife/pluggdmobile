import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Music, Users, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface OnboardingData {
  userPath: 'user' | 'creator';
  userType: 'artist' | 'producer' | 'industry';
  genres: string[];
  experience: string;
  goals: string[];
  bio: string;
  socialLinks: Record<string, string>;
}

export const OnboardingFlow = ({ isOpen, onComplete }: { isOpen: boolean; onComplete: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    userPath: 'user',
    userType: 'artist',
    genres: [],
    experience: '',
    goals: [],
    bio: '',
    socialLinks: {}
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const genreOptions = [
    'Hip Hop', 'Electronic', 'Pop', 'Rock', 'Jazz', 'Classical',
    'R&B', 'Country', 'Reggae', 'Latin', 'Alternative', 'Indie'
  ];

  const goalOptions = [
    'Create and sell beats',
    'Collaborate with other artists',
    'Learn music production',
    'Build a fanbase',
    'Network in the industry',
    'License music for media'
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleGenre = (genre: string) => {
    setData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: data.userType,
          bio: data.bio,
          is_creator: data.userPath === 'creator',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Save onboarding completion to database
      const { error: onboardingError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);

      if (onboardingError) throw onboardingError;

      // Also save to localStorage as backup
      localStorage.setItem('onboarding_completed', 'true');
      
      toast({
        title: "Welcome to 9X Music!",
        description: "Your profile has been set up successfully."
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Welcome to 9X Music!</h2>
              <p className="text-muted-foreground">Choose your path to get started</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-3 block">Choose your path:</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { 
                    value: 'user', 
                    label: 'Music Fan', 
                    desc: 'Discover, purchase, and enjoy music from creators',
                    icon: '🎧'
                  },
                  { 
                    value: 'creator', 
                    label: 'Creator', 
                    desc: 'Share your music, build a fanbase, and earn money',
                    icon: '🎵'
                  }
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-colors ${
                      data.userPath === option.value ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setData(prev => ({ ...prev, userPath: option.value as any }))}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{option.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              data.userPath === option.value ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`} />
                            <h3 className="font-semibold text-lg">{option.label}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">What best describes you?</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-3 block">I am a...</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'artist', label: 'Artist', desc: 'Singer, rapper, songwriter' },
                  { value: 'producer', label: 'Producer', desc: 'Beat maker, sound engineer' },
                  { value: 'industry', label: 'Industry Professional', desc: 'Label, manager, publisher' }
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-colors ${
                      data.userType === option.value ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setData(prev => ({ ...prev, userType: option.value as any }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          data.userType === option.value ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`} />
                        <div>
                          <h3 className="font-medium">{option.label}</h3>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What genres do you work with?</h2>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {genreOptions.map((genre) => (
                <div
                  key={genre}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    data.genres.includes(genre) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => toggleGenre(genre)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={data.genres.includes(genre)} />
                    <span className="text-sm font-medium">{genre}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What's your experience level?</h2>
              <p className="text-muted-foreground">This helps us recommend the right content</p>
            </div>
            
            <Select value={data.experience} onValueChange={(value) => setData(prev => ({ ...prev, experience: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (Just starting out)</SelectItem>
                <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                <SelectItem value="advanced">Advanced (3-5 years)</SelectItem>
                <SelectItem value="professional">Professional (5+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What are your goals?</h2>
              <p className="text-muted-foreground">Select all that interest you</p>
            </div>
            
            <div className="space-y-3">
              {goalOptions.map((goal) => (
                <div
                  key={goal}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    data.goals.includes(goal) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => toggleGoal(goal)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={data.goals.includes(goal)} />
                    <span className="text-sm font-medium">{goal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">Add a bio to help others discover you</p>
            </div>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Write a short bio about yourself, your music style, and what you're looking for..."
                value={data.bio}
                onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
              />
              
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">You're all set!</h3>
                <p className="text-muted-foreground">Your profile is ready. Let's start making music!</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Setup Your Profile</span>
            <Badge variant="outline">{currentStep} of {totalSteps}</Badge>
          </DialogTitle>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <div className="py-6">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button onClick={handleNext}>
            {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
            {currentStep !== totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to localStorage
        const completed = localStorage.getItem('onboarding_completed');
        if (!completed) {
          setShowOnboarding(true);
        }
        return;
      }

      if (!data?.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
      // Fallback to localStorage
      const completed = localStorage.getItem('onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  return { showOnboarding, completeOnboarding };
};