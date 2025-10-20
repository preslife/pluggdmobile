import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Music, Users, DollarSign, Star } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

const CreatorSetup = () => {
  usePageMetadata({
    title: "Creator Setup — Pluggd",
    description: "Claim your Pluggd creator profile, configure your bio, and unlock tools for releases, beats, and memberships.",
    path: "/creator/setup",
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    agreedToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the creator terms and conditions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile to mark as creator
      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          bio: formData.bio,
          is_creator: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Welcome to Creators!",
        description: "Your creator profile has been set up successfully",
      });

      // Redirect to creator profile
      navigate(`/creator/${user.id}`);
    } catch (error) {
      console.error("Error setting up creator profile:", error);
      toast({
        title: "Error",
        description: "Failed to set up creator profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Become a Creator</h1>
        <p className="text-muted-foreground">
          Join our community of creators and start building your fanbase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Music className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">Share Your Music</h3>
            <p className="text-sm text-muted-foreground">
              Upload and showcase your releases
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">Build Your Fanbase</h3>
            <p className="text-sm text-muted-foreground">
              Connect with fans and supporters
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">Monetize Content</h3>
            <p className="text-sm text-muted-foreground">
              Earn from your music and content
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Set Up Your Creator Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium">Username *</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="your-username"
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be your unique creator handle
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell your fans about yourself and your music..."
                rows={4}
                className="mt-1"
              />
            </div>


            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-medium mb-2">Creator Benefits</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload and share your music releases</li>
                <li>• Build a dedicated fanbase</li>
                <li>• Receive fan support and tips</li>
                <li>• Access creator analytics</li>
                <li>• Featured in creator discovery</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) => 
                  setFormData({...formData, agreedToTerms: checked as boolean})
                }
              />
              <label htmlFor="terms" className="text-sm">
                I agree to the{" "}
                <a href="/terms" className="text-primary hover:underline">
                  creator terms and conditions
                </a>
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.username || !formData.agreedToTerms}
                className="flex-1"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Become a Creator
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorSetup;