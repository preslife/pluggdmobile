import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Settings, Info, RefreshCw, Trash2 } from "lucide-react";
import { FavNicknameSelector } from "../components/FavNicknameSelector";
import DomainAwareNavigation from "../components/DomainAwareNavigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserFavNickname {
  nickname: string;
  custom_icon: string;
  display_order: number;
}

export const SettingsFavNicknamesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentNicknames, setCurrentNicknames] = useState<UserFavNickname[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    document.title = "FAV Nicknames Settings — Pluggd";
    if (user) {
      fetchCurrentNicknames();
    }
  }, [user]);

  const fetchCurrentNicknames = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_fav_nicknames')
        .select('nickname, custom_icon, display_order')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCurrentNicknames(data || []);
    } catch (error) {
      console.error('Error fetching current nicknames:', error);
      toast({
        title: "Error",
        description: "Failed to load your current FAV nicknames",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNicknamesUpdated = (nicknames: UserFavNickname[]) => {
    setCurrentNicknames(nicknames);
    toast({
      title: "Success!",
      description: "Your FAV nicknames have been updated",
    });
  };

  const handleClearAll = async () => {
    if (!user) return;

    setClearing(true);
    try {
      const { error } = await supabase
        .from('user_fav_nicknames')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentNicknames([]);
      toast({
        title: "Cleared",
        description: "All FAV nicknames have been removed",
      });
    } catch (error) {
      console.error('Error clearing nicknames:', error);
      toast({
        title: "Error",
        description: "Failed to clear your FAV nicknames",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const handleReset = () => {
    fetchCurrentNicknames();
    toast({
      title: "Reset",
      description: "Settings have been reset to your current saved nicknames",
    });
  };

  const getPriorityLabel = (order: number) => {
    switch (order) {
      case 0: return 'Primary';
      case 1: return 'Secondary';
      case 2: return 'Tertiary';
      default: return '';
    }
  };

  const getPriorityColor = (order: number) => {
    switch (order) {
      case 0: return 'bg-primary text-primary-foreground';
      case 1: return 'bg-secondary text-secondary-foreground';
      case 2: return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <main className="px-6 py-8 pt-24">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="px-6 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-8 w-8" />
                FAV Nicknames Settings
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your favorite nicknames that represent your musical identity on Pluggd.
              </p>
            </div>

            {/* Current Nicknames Display */}
            {currentNicknames.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Your Current FAV Nicknames
                  </CardTitle>
                  <CardDescription>
                    These nicknames are displayed throughout the platform and represent your musical identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {currentNicknames.map((nickname, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{nickname.custom_icon}</div>
                          <div>
                            <div className="font-medium">{nickname.nickname}</div>
                            <div className="text-sm text-muted-foreground">
                              {getPriorityLabel(nickname.display_order)} nickname
                            </div>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(nickname.display_order)}>
                          {getPriorityLabel(nickname.display_order)}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Changes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleClearAll}
                      disabled={clearing}
                      className="flex-1"
                    >
                      {clearing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>How FAV Nicknames Work:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Your <strong>Primary</strong> nickname appears prominently on your profile and in comments</li>
                  <li>• <strong>Secondary</strong> and <strong>Tertiary</strong> nicknames appear in various contexts throughout the platform</li>
                  <li>• You can select up to 3 nicknames from our suggestions or create custom ones</li>
                  <li>• Changes take effect immediately and are visible to other users</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          {/* FAV Nickname Selector */}
          <div className="space-y-6">
            <FavNicknameSelector
              onComplete={handleNicknamesUpdated}
              showTitle={false}
              maxSelections={3}
              mode="settings"
            />
          </div>

          {/* Additional Info */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Can't find the perfect nickname?</strong> Use the "Create Custom" tab to make your own unique nickname with a custom icon.
              </p>
              <p>
                <strong>Want to change the order?</strong> Simply remove and re-add your nicknames in the order you prefer.
              </p>
              <p>
                <strong>Not seeing your changes?</strong> Your FAV nicknames update immediately across the platform. Try refreshing the page if you're not seeing them.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SettingsFavNicknamesPage;