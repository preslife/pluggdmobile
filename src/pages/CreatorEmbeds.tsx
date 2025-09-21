import { useState, useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Monitor, Smartphone, Palette, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackPhase4Events } from "@/lib/analytics";

interface EmbedSettings {
  theme: 'dark' | 'light' | 'neon';
  accent: string;
  size: 'compact' | 'card';
  autoplay: boolean;
  [key: string]: any; // Make it compatible with Json type
}

const CreatorEmbeds = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<EmbedSettings>({
    theme: 'dark',
    accent: '#6366f1',
    size: 'card',
    autoplay: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<'release' | 'beat'>('release');

  useEffect(() => {
    setMeta(
      "Embed Gallery — Pluggd",
      "Create customizable embed players for your releases and beats.",
      "/dashboard/creator/embeds"
    );
    trackPhase4Events.embedGalleryAccessed();
  }, []);

  useEffect(() => {
    if (user) {
      fetchEmbedSettings();
    }
  }, [user]);

  const fetchEmbedSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('embed_settings')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data?.embed_settings) {
        setSettings(data.embed_settings as EmbedSettings);
      }
    } catch (error) {
      console.error('Error fetching embed settings:', error);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ embed_settings: settings as any })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Track settings update
      trackPhase4Events.embedSettingsUpdated(settings);

      toast({
        title: "Settings Saved",
        description: "Your embed preferences have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const generateEmbedCode = (type: 'release' | 'beat', id: string) => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/embed/${type}/${id}`;
    const height = settings.size === 'compact' ? '120' : '200';
    
    return `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };

  const copyEmbedCode = (type: 'release' | 'beat') => {
    const sampleId = type === 'release' ? 'your-release-slug' : 'your-beat-id';
    const code = generateEmbedCode(type, sampleId);
    navigator.clipboard.writeText(code);
    
    // Track embed code copy
    trackPhase4Events.embedCodeCopied(type);
    
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
  };

  const PreviewPlayer = ({ type }: { type: 'release' | 'beat' }) => {
    const isDark = settings.theme === 'dark';
    const isNeon = settings.theme === 'neon';
    const isCompact = settings.size === 'compact';

    return (
      <div 
        className={`
          rounded-lg border p-4 w-full max-w-md mx-auto
          ${isDark ? 'bg-gray-900 border-gray-700' : isNeon ? 'bg-black border-purple-500' : 'bg-white border-gray-200'}
        `}
        style={{ 
          borderColor: isNeon ? settings.accent : undefined,
          boxShadow: isNeon ? `0 0 20px ${settings.accent}33` : undefined
        }}
      >
        <div className="flex items-center space-x-3">
          <div 
            className={`
              rounded-lg flex-shrink-0 flex items-center justify-center
              ${isCompact ? 'w-12 h-12' : 'w-16 h-16'}
            `}
            style={{ backgroundColor: settings.accent }}
          >
            <Play className={`text-white ${isCompact ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`
              font-semibold truncate
              ${isCompact ? 'text-sm' : 'text-base'}
              ${isDark || isNeon ? 'text-white' : 'text-gray-900'}
            `}>
              {type === 'release' ? 'Sample Release' : 'Sample Beat'}
            </h3>
            <p className={`
              text-sm truncate
              ${isDark || isNeon ? 'text-gray-300' : 'text-gray-600'}
            `}>
              {type === 'release' ? 'by Artist Name' : 'Hip Hop • 140 BPM'}
            </p>
            {!isCompact && (
              <div className="flex items-center space-x-2 mt-2">
                <div className={`
                  h-1 bg-gray-300 rounded-full flex-1
                  ${isDark || isNeon ? 'bg-gray-600' : 'bg-gray-300'}
                `}>
                  <div 
                    className="h-1 rounded-full w-1/3" 
                    style={{ backgroundColor: settings.accent }}
                  ></div>
                </div>
                <span className={`
                  text-xs
                  ${isDark || isNeon ? 'text-gray-400' : 'text-gray-500'}
                `}>
                  1:23 / 3:45
                </span>
              </div>
            )}
          </div>
        </div>
        
        {settings.autoplay && (
          <div className={`
            mt-2 text-xs text-center
            ${isDark || isNeon ? 'text-gray-400' : 'text-gray-500'}
          `}>
            Autoplay enabled
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Embed Gallery</h1>
            <p className="text-muted-foreground">
              Create customizable embed players for your releases and beats that match your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Customization
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance of your embed players
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={settings.theme} onValueChange={(value: any) => setSettings({ ...settings, theme: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="neon">Neon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="accent">Accent Color</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        type="color"
                        value={settings.accent}
                        onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={settings.accent}
                        onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
                        placeholder="#6366f1"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Select value={settings.size} onValueChange={(value: any) => setSettings({ ...settings, size: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact (120px)</SelectItem>
                        <SelectItem value="card">Card (200px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoplay">Autoplay</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start playing when loaded
                      </p>
                    </div>
                    <Switch
                      id="autoplay"
                      checked={settings.autoplay}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoplay: checked })}
                    />
                  </div>

                  <Button onClick={saveSettings} disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Embed Code</CardTitle>
                  <CardDescription>
                    Copy the iframe code to embed on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedPreview} onValueChange={(value: any) => setSelectedPreview(value)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="release">Release</TabsTrigger>
                      <TabsTrigger value="beat">Beat</TabsTrigger>
                    </TabsList>
                    <TabsContent value="release" className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg text-sm font-mono break-all">
                        {generateEmbedCode('release', 'your-release-slug')}
                      </div>
                      <Button onClick={() => copyEmbedCode('release')} variant="outline" className="w-full">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Release Embed Code
                      </Button>
                    </TabsContent>
                    <TabsContent value="beat" className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg text-sm font-mono break-all">
                        {generateEmbedCode('beat', 'your-beat-id')}
                      </div>
                      <Button onClick={() => copyEmbedCode('beat')} variant="outline" className="w-full">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Beat Embed Code
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your embed will look on websites
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedPreview} onValueChange={(value: any) => setSelectedPreview(value)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="release">Release Player</TabsTrigger>
                      <TabsTrigger value="beat">Beat Player</TabsTrigger>
                    </TabsList>
                    <TabsContent value="release" className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                        <PreviewPlayer type="release" />
                      </div>
                    </TabsContent>
                    <TabsContent value="beat" className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                        <PreviewPlayer type="beat" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Mobile Preview
                  </CardTitle>
                  <CardDescription>
                    How your embed appears on mobile devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-w-xs mx-auto">
                    <PreviewPlayer type={selectedPreview} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatorEmbeds;