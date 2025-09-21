import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PenTool, Sparkles, RefreshCw, Copy, Download, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AILyricGenerator = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("pop");
  const [mood, setMood] = useState("upbeat");
  const [structure, setStructure] = useState("verse-chorus");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedLyrics, setSavedLyrics] = useState<string[]>([]);

  const genres = [
    "pop", "rock", "hip-hop", "country", "r&b", "indie", "folk", "electronic", "jazz", "blues", 
    "reggae", "dancehall", "afrobeats", "drill", "uk drill", "grime", "trap", "soca", "bashment"
  ];

  const moods = [
    "upbeat", "melancholic", "romantic", "energetic", "chill", "angry", "hopeful", "nostalgic", "mysterious", "playful"
  ];

  const structures = [
    { value: "verse-chorus", label: "Verse-Chorus" },
    { value: "aaba", label: "AABA" },
    { value: "verse-prechorus-chorus", label: "Verse-PreChorus-Chorus" },
    { value: "story", label: "Storytelling" },
    { value: "free", label: "Free Form" }
  ];

  const generateLyrics = async () => {
    if (!theme.trim()) {
      toast({
        title: "Theme Required",
        description: "Please enter a theme or topic for your lyrics",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          theme,
          genre,
          mood,
          structure,
          instructions: customPrompt
        }
      });

      if (error) throw error;

      setGeneratedLyrics(data.lyrics);
      toast({
        title: "Lyrics Generated",
        description: "Your AI-generated lyrics are ready!",
      });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate lyrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePlaceholderLyrics = () => {
    const templates = {
      "verse-chorus": `[Verse 1]
${theme} fills my heart today
Walking down this ${mood} way
Every step I take is true
${genre} beats are calling through

[Chorus]
${theme} is all I need
Like a ${mood} melody
Singing out for all to see
This is who I'm meant to be

[Verse 2]
Looking back on yesterday
${theme} showed me how to pray
For the dreams that lie ahead
${mood} thoughts inside my head

[Chorus]
${theme} is all I need
Like a ${mood} melody
Singing out for all to see
This is who I'm meant to be

[Bridge]
When the world gets heavy
And the road seems long
${theme} keeps me steady
Like a ${genre} song

[Chorus]
${theme} is all I need
Like a ${mood} melody
Singing out for all to see
This is who I'm meant to be`,

      "aaba": `[A Section]
${theme} in the ${mood} light
Everything feels so right
${genre} rhythm in my soul
Making me feel whole

[A Section]
${theme} in the ${mood} light
Everything feels so right
${genre} rhythm in my soul
Making me feel whole

[B Section]
But when the darkness falls
And ${theme} softly calls
I remember who I am
Part of a greater plan

[A Section]
${theme} in the ${mood} light
Everything feels so right
${genre} rhythm in my soul
Making me feel whole`,

      "story": `Once upon a time in a ${mood} place
${theme} showed its beautiful face
The ${genre} sound was everywhere
Floating gently through the air

Chapter one begins with hope
Teaching hearts and souls to cope
${theme} whispers in the breeze
Bringing troubled minds to ease

As the story unfolds each day
${theme} lights up the way
Through the ${mood} journey we take
Every choice that we make

In the end we'll understand
${theme} was always close at hand
Like a ${genre} lullaby
Underneath the starlit sky`
    };

    return templates[structure as keyof typeof templates] || templates["verse-chorus"];
  };

  const copyLyrics = () => {
    navigator.clipboard.writeText(generatedLyrics);
    toast({
      title: "Lyrics Copied",
      description: "Lyrics copied to clipboard",
    });
  };

  const saveLyrics = () => {
    if (generatedLyrics && !savedLyrics.includes(generatedLyrics)) {
      setSavedLyrics(prev => [...prev, generatedLyrics]);
      toast({
        title: "Lyrics Saved",
        description: "Added to your saved lyrics collection",
      });
    }
  };

  const exportLyrics = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedLyrics], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `lyrics-${theme.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Lyrics Exported",
      description: "Download started",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            AI Lyric Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Theme/Topic *</Label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., love, friendship, dreams, freedom..."
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Structure</Label>
              <Select value={structure} onValueChange={setStructure}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Instructions (Optional)</Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add specific instructions like rhyme scheme, perspective, story elements..."
              className="h-20"
            />
          </div>

          <Button 
            onClick={generateLyrics} 
            disabled={isGenerating || !theme.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Generating Lyrics...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Lyrics
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedLyrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Lyrics</span>
              <div className="flex gap-2">
                <Badge variant="secondary">{genre}</Badge>
                <Badge variant="secondary">{mood}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={generatedLyrics}
              onChange={(e) => setGeneratedLyrics(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyLyrics} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={saveLyrics} variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={exportLyrics} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={generateLyrics} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {savedLyrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Lyrics ({savedLyrics.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedLyrics.map((lyrics, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm line-clamp-3">{lyrics}</p>
                  <Button 
                    onClick={() => setGeneratedLyrics(lyrics)}
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AILyricGenerator;