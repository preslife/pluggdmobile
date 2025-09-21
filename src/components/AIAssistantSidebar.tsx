import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  ArrowDown, 
  Lightbulb, 
  Zap, 
  Music2,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Metronome from "./Metronome";

interface AIAssistantSidebarProps {
  onInsertText: (text: string) => void;
  currentLyrics: string;
  songGenre: string;
}

const AIAssistantSidebar = ({ onInsertText, currentLyrics, songGenre }: AIAssistantSidebarProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptType, setPromptType] = useState("verse");
  const [mood, setMood] = useState("energetic");

  const promptTypes = {
    verse: "Write a verse",
    chorus: "Write a chorus",
    bridge: "Write a bridge",
    hook: "Write a hook",
    complete: "Complete this lyric",
    rhyme: "Find rhymes for",
    rewrite: "Rewrite this section"
  };

  const moods = {
    energetic: "energetic and uplifting",
    dark: "dark and moody",
    romantic: "romantic and emotional",
    aggressive: "aggressive and intense",
    melancholic: "melancholic and introspective",
    party: "party and celebratory"
  };

  const generateLyrics = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter what you want to generate",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          theme: prompt,
          genre: songGenre,
          mood: mood,
          rhymeScheme: promptType === 'rhyme' ? 'ABAB' : undefined,
          perspective: promptType === 'verse' ? 'first person' : undefined,
          vibe: promptType === 'hook' ? 'catchy and memorable' : undefined,
          instructions: `Generate ${promptType} lyrics with a ${mood} mood`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setGeneratedText(data.lyrics);
      
      toast({
        title: "AI Lyrics Generated",
        description: "Created using OpenAI",
      });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate lyrics. Try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLyricsStructure = (type: string, userPrompt: string, selectedMood: string, genre: string) => {
    const structures = {
      verse: `[Verse - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Add your lyrics here following this theme]`,
      chorus: `[Chorus - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Repeat this section for impact]`,
      bridge: `[Bridge - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Connect your verses and chorus]`,
      hook: `[Hook - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Catchy memorable line]`,
      complete: `[Complete Section - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Continue from this theme]`,
      rhyme: `[Rhymes for: ${userPrompt}]\n\n[Find words that rhyme and fit your ${selectedMood} ${genre} style]`,
      rewrite: `[Rewritten Section - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Enhanced version]`
    };
    
    return structures[type as keyof typeof structures] || 
           `[${type} - ${selectedMood} ${genre}]\n${userPrompt}\n\n[Develop this theme further]`;
  };

  const insertGenerated = () => {
    if (generatedText) {
      onInsertText(generatedText);
      setGeneratedText("");
      toast({
        title: "Text Inserted",
        description: "AI content added to your lyrics",
      });
    }
  };

  const quickPrompts = [
    "Write about overcoming challenges",
    "Create a catchy hook about success",
    "Write about late night vibes",
    "Create verses about loyalty",
    "Write about chasing dreams"
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="metronome">
              <Clock className="w-4 h-4 mr-1" />
              Metronome
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>What to generate</Label>
                <Select value={promptType} onValueChange={setPromptType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(promptTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mood/Style</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(moods).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Your prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to write about..."
                  className="min-h-[100px] text-sm"
                />
              </div>

              <Button 
                onClick={generateLyrics} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {generatedText && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Generated Content</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{generatedText}</p>
                  </div>
                </div>
                <Button onClick={insertGenerated} className="w-full">
                  <ArrowDown className="w-4 h-4 mr-2" />
                  Insert into Lyrics
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Lightbulb className="w-4 h-4" />
                Quick Prompts
              </Label>
              <div className="space-y-1">
                {quickPrompts.map((quickPrompt, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start text-xs h-auto p-2"
                    onClick={() => setPrompt(quickPrompt)}
                  >
                    {quickPrompt}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metronome" className="mt-4">
            <Metronome />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIAssistantSidebar;