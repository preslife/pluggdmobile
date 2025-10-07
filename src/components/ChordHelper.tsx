import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Music2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ChordHelper = () => {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedScale, setSelectedScale] = useState("major");
  const [progression, setProgression] = useState<string[]>([]);

  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const scales = {
    major: "Major",
    minor: "Natural Minor",
    dorian: "Dorian",
    mixolydian: "Mixolydian"
  };

  const chordFormulas = {
    major: [
      { numeral: "I", type: "maj", degree: 1 },
      { numeral: "ii", type: "min", degree: 2 },
      { numeral: "iii", type: "min", degree: 3 },
      { numeral: "IV", type: "maj", degree: 4 },
      { numeral: "V", type: "maj", degree: 5 },
      { numeral: "vi", type: "min", degree: 6 },
      { numeral: "vii°", type: "dim", degree: 7 }
    ],
    minor: [
      { numeral: "i", type: "min", degree: 1 },
      { numeral: "ii°", type: "dim", degree: 2 },
      { numeral: "♭III", type: "maj", degree: 3 },
      { numeral: "iv", type: "min", degree: 4 },
      { numeral: "v", type: "min", degree: 5 },
      { numeral: "♭VI", type: "maj", degree: 6 },
      { numeral: "♭VII", type: "maj", degree: 7 }
    ],
    dorian: [
      { numeral: "i", type: "min", degree: 1 },
      { numeral: "ii", type: "min", degree: 2 },
      { numeral: "♭III", type: "maj", degree: 3 },
      { numeral: "IV", type: "maj", degree: 4 },
      { numeral: "v", type: "min", degree: 5 },
      { numeral: "vi°", type: "dim", degree: 6 },
      { numeral: "♭VII", type: "maj", degree: 7 }
    ],
    mixolydian: [
      { numeral: "I", type: "maj", degree: 1 },
      { numeral: "ii", type: "min", degree: 2 },
      { numeral: "iii°", type: "dim", degree: 3 },
      { numeral: "IV", type: "maj", degree: 4 },
      { numeral: "v", type: "min", degree: 5 },
      { numeral: "vi", type: "min", degree: 6 },
      { numeral: "♭VII", type: "maj", degree: 7 }
    ]
  };

  const scaleIntervals = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10]
  };

  const getChordName = (keyIndex: number, degree: number, type: string) => {
    const intervals = scaleIntervals[selectedScale as keyof typeof scaleIntervals];
    const chordRoot = (keyIndex + intervals[degree - 1]) % 12;
    const chordName = keys[chordRoot];
    
    const suffix = {
      maj: "",
      min: "m",
      dim: "°",
      aug: "+"
    }[type] || "";
    
    return chordName + suffix;
  };

  const getCurrentChords = () => {
    const keyIndex = keys.indexOf(selectedKey);
    const chordSet = chordFormulas[selectedScale as keyof typeof chordFormulas];
    
    return chordSet.map(chord => ({
      ...chord,
      name: getChordName(keyIndex, chord.degree, chord.type)
    }));
  };

  const commonProgressions = {
    major: [
      { name: "I-V-vi-IV", chords: [1, 5, 6, 4] },
      { name: "vi-IV-I-V", chords: [6, 4, 1, 5] },
      { name: "I-vi-IV-V", chords: [1, 6, 4, 5] },
      { name: "I-IV-vi-V", chords: [1, 4, 6, 5] },
      { name: "ii-V-I", chords: [2, 5, 1] }
    ],
    minor: [
      { name: "i-♭VII-♭VI-♭VII", chords: [1, 7, 6, 7] },
      { name: "i-iv-♭VII-♭III", chords: [1, 4, 7, 3] },
      { name: "i-♭VI-♭VII-i", chords: [1, 6, 7, 1] },
      { name: "i-v-♭VI-iv", chords: [1, 5, 6, 4] }
    ],
    dorian: [
      { name: "i-♭VII-IV-i", chords: [1, 7, 4, 1] },
      { name: "i-iv-♭VII-i", chords: [1, 4, 7, 1] }
    ],
    mixolydian: [
      { name: "I-♭VII-IV-I", chords: [1, 7, 4, 1] },
      { name: "I-v-♭VII-IV", chords: [1, 5, 7, 4] }
    ]
  };

  const addChordToProgression = (chordName: string) => {
    setProgression(prev => [...prev, chordName]);
  };

  const applyProgression = (progressionChords: number[]) => {
    const chords = getCurrentChords();
    const chordNames = progressionChords.map(degree => 
      chords.find(chord => chord.degree === degree)?.name || ""
    );
    setProgression(chordNames);
  };

  const copyProgression = () => {
    const progressionText = progression.join(" - ");
    navigator.clipboard.writeText(progressionText);
    toast({
      title: "Copied to Clipboard",
      description: `Progression: ${progressionText}`,
    });
  };

  const clearProgression = () => {
    setProgression([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            Chord Helper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scale</Label>
              <Select value={selectedScale} onValueChange={setSelectedScale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scales).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Available Chords ({selectedKey} {scales[selectedScale as keyof typeof scales]})</Label>
            <div className="grid grid-cols-4 gap-2">
              {getCurrentChords().map((chord, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => addChordToProgression(chord.name)}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="font-bold">{chord.name}</span>
                  <span className="text-xs text-muted-foreground">{chord.numeral}</span>
                </Button>
              ))}
            </div>
          </div>

          {progression.length > 0 && (
            <div className="space-y-3">
              <Label>Your Progression</Label>
              <div className="flex flex-wrap gap-2">
                {progression.map((chord, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                    {chord}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={copyProgression} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={clearProgression} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Common Progressions</Label>
            <div className="grid grid-cols-1 gap-2">
              {(commonProgressions[selectedScale as keyof typeof commonProgressions] || []).map((prog, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => applyProgression(prog.chords)}
                  className="justify-start h-auto py-2"
                >
                  <span className="font-medium">{prog.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChordHelper;
