import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsSettingsProps {
  onSave: (settings: { spotifyArtistId: string; youtubeChannelId: string }) => void;
  initialSettings?: { spotifyArtistId: string; youtubeChannelId: string };
}

export const AnalyticsSettings = ({ onSave, initialSettings }: AnalyticsSettingsProps) => {
  const [spotifyArtistId, setSpotifyArtistId] = useState(initialSettings?.spotifyArtistId || "");
  const [youtubeChannelId, setYoutubeChannelId] = useState(initialSettings?.youtubeChannelId || "");
  const { toast } = useToast();

  const handleSave = () => {
    if (!spotifyArtistId || !youtubeChannelId) {
      toast({
        title: "Missing Information",
        description: "Please provide both Spotify Artist ID and YouTube Channel ID",
        variant: "destructive",
      });
      return;
    }

    onSave({ spotifyArtistId, youtubeChannelId });
    toast({
      title: "Settings Saved",
      description: "Your analytics settings have been updated",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analytics Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="spotify-id">Spotify Artist ID</Label>
          <Input
            id="spotify-id"
            placeholder="e.g., 1dfeR4HaWDbWqFHLkxsg1d"
            value={spotifyArtistId}
            onChange={(e) => setSpotifyArtistId(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Find your Spotify Artist ID in your Spotify for Artists dashboard or artist URL
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="youtube-id">YouTube Channel ID</Label>
          <Input
            id="youtube-id"
            placeholder="e.g., UCuAXFkgsw1L7xaCfnd5JJOw"
            value={youtubeChannelId}
            onChange={(e) => setYoutubeChannelId(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Find your YouTube Channel ID in your YouTube Studio settings
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};