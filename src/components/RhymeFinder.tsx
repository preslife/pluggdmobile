import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, BookOpen, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RhymeFinder = () => {
  const { toast } = useToast();
  const [searchWord, setSearchWord] = useState("");
  const [rhymes, setRhymes] = useState<{ word: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Basic rhyme patterns for demonstration
  const rhymePatterns = {
    perfect: {
      "ight": ["bright", "light", "night", "sight", "fight", "tight", "right", "might", "height", "flight"],
      "ay": ["day", "way", "say", "play", "stay", "may", "pay", "lay", "gray", "pray"],
      "ove": ["love", "above", "dove", "shove", "glove"],
      "eart": ["heart", "start", "part", "art", "smart", "chart", "cart"],
      "ime": ["time", "rhyme", "climb", "prime", "crime", "dime", "lime"],
      "ound": ["sound", "ground", "round", "found", "bound", "wound", "pound"],
      "ame": ["name", "game", "same", "frame", "blame", "flame", "shame", "claim"],
      "ead": ["head", "bed", "red", "said", "dead", "bread", "thread", "spread"],
      "ack": ["back", "track", "pack", "black", "crack", "stack", "attack"],
      "all": ["all", "call", "fall", "small", "wall", "ball", "tall", "hall"]
    },
    near: {
      "ight": ["white", "quite", "write", "bite", "site", "cite", "kite"],
      "ay": ["hey", "they", "weigh", "prey", "bay", "clay"],
      "ove": ["move", "prove", "groove", "improve"],
      "eart": ["apart", "depart", "restart"],
      "ime": ["dime", "chime", "mime", "thyme"],
      "ound": ["around", "compound", "profound", "astound"],
      "ame": ["came", "became", "proclaim", "acclaim"],
      "ead": ["instead", "ahead", "widespread"],
      "ack": ["lack", "slack", "feedback", "soundtrack"],
      "all": ["recall", "install", "enthrall", "overall"]
    }
  };

  const findRhymes = (word: string) => {
    const lowerWord = word.toLowerCase();
    const results: { word: string; type: string }[] = [];
    
    // Find rhyming pattern
    for (const [ending, perfectRhymes] of Object.entries(rhymePatterns.perfect)) {
      if (lowerWord.endsWith(ending)) {
        perfectRhymes.forEach(rhyme => {
          if (rhyme !== lowerWord) {
            results.push({ word: rhyme, type: "perfect" });
          }
        });
        
        // Add near rhymes
        const nearRhymes = rhymePatterns.near[ending as keyof typeof rhymePatterns.near];
        if (Array.isArray(nearRhymes)) {
          nearRhymes.forEach(rhyme => {
            if (rhyme !== lowerWord && !results.find(r => r.word === rhyme)) {
              results.push({ word: rhyme, type: "near" });
            }
          });
        }
      }
    }

    // Add some slant rhymes based on similar endings
    const endings = ["ing", "ed", "er", "ly", "tion", "ness"];
    endings.forEach(ending => {
      if (lowerWord.endsWith(ending)) {
        const baseWord = lowerWord.slice(0, -ending.length);
        if (baseWord.length > 2) {
          results.push({ word: baseWord + "s", type: "slant" });
          if (ending === "ing") {
            results.push({ word: baseWord + "ed", type: "slant" });
          }
        }
      }
    });

    return results.slice(0, 20); // Limit results
  };

  const searchRhymes = () => {
    if (!searchWord.trim()) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const foundRhymes = findRhymes(searchWord);
      setRhymes(foundRhymes);
      setIsLoading(false);
      
      if (foundRhymes.length === 0) {
        toast({
          title: "No Rhymes Found",
          description: "Try a different word or check the spelling",
          variant: "destructive"
        });
      }
    }, 500);
  };

  const copyWord = (word: string) => {
    navigator.clipboard.writeText(word);
    toast({
      title: "Copied",
      description: `"${word}" copied to clipboard`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchRhymes();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "perfect": return "bg-green-100 text-green-800 border-green-200";
      case "near": return "bg-blue-100 text-blue-800 border-blue-200";
      case "slant": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Rhyme Finder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Find rhymes for a word</Label>
            <div className="flex gap-2">
              <Input
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a word..."
                className="flex-1"
              />
              <Button onClick={searchRhymes} disabled={isLoading || !searchWord.trim()}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Finding rhymes...</p>
            </div>
          )}

          {rhymes.length > 0 && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Rhymes for "{searchWord}"</Label>
                <Badge variant="outline" className="text-xs">
                  {rhymes.length} found
                </Badge>
              </div>
              
              <div className="space-y-3">
                {["perfect", "near", "slant"].map(type => {
                  const typeRhymes = rhymes.filter(r => r.type === type);
                  if (typeRhymes.length === 0) return null;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <Label className="text-sm capitalize">{type} Rhymes</Label>
                      <div className="flex flex-wrap gap-2">
                        {typeRhymes.map((rhyme, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => copyWord(rhyme.word)}
                            className={`h-auto py-1 px-2 ${getTypeColor(rhyme.type)}`}
                          >
                            <span>{rhyme.word}</span>
                            <Copy className="w-3 h-3 ml-1" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Rhyme Types</Label>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-green-100 text-green-800 border-green-200">Perfect - Exact sound match</Badge>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">Near - Close sound match</Badge>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Slant - Similar ending sounds</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RhymeFinder;