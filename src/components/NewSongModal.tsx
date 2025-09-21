import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Search, Music, Plus } from "lucide-react";

interface NewSongModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSong: (data: SongCreationData) => void;
}

export interface SongCreationData {
  name: string;
  template: string;
  beat: {
    type: 'library' | 'upload' | 'marketplace';
    file?: File;
    id?: string;
    name: string;
  };
}

const songTemplates = {
  "hip-hop": {
    name: "Hip-Hop",
    structure: ["Intro", "Verse 1", "Hook", "Verse 2", "Hook", "Bridge", "Hook", "Outro"]
  },
  "pop": {
    name: "Pop",
    structure: ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Chorus", "Outro"]
  },
  "rnb": {
    name: "R&B",
    structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"]
  },
  "trap": {
    name: "Trap",
    structure: ["Intro", "Verse 1", "Hook", "Verse 2", "Hook", "Verse 3", "Hook", "Outro"]
  },
  "rock": {
    name: "Rock",
    structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Solo", "Chorus", "Outro"]
  }
};


const marketplaceBeats = [
  { id: "m1", name: "Metro Boomin Type Beat", genre: "Trap", bpm: 145, price: 25 },
  { id: "m2", name: "Drake Type Beat", genre: "Hip-Hop", bpm: 100, price: 30 },
  { id: "m3", name: "The Weeknd Type Beat", genre: "R&B", bpm: 120, price: 35 }
];

const NewSongModal = ({ open, onOpenChange, onCreateSong }: NewSongModalProps) => {
  const [songName, setSongName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("hip-hop");
  const [selectedBeat, setSelectedBeat] = useState<SongCreationData['beat'] | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [libraryBeats, setLibraryBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLibraryBeats();
    }
  }, [open]);

  const fetchLibraryBeats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLibraryBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setSelectedBeat({
        type: 'upload',
        file,
        name: file.name
      });
    }
  };

  const handleLibrarySelect = (beat: any) => {
    setSelectedBeat({
      type: 'library',
      id: beat.id,
      name: beat.title
    });
  };

  const handleMarketplaceSelect = (beat: any) => {
    setSelectedBeat({
      type: 'marketplace',
      id: beat.id,
      name: beat.name
    });
  };

  const handleCreateSong = () => {
    if (!songName || !selectedBeat) return;
    
    onCreateSong({
      name: songName,
      template: selectedTemplate,
      beat: selectedBeat
    });
    
    // Reset form
    setSongName("");
    setSelectedTemplate("hip-hop");
    setSelectedBeat(null);
    setUploadedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Song
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="song-name">Song Name</Label>
            <Input
              id="song-name"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="Enter song name..."
            />
          </div>

          <div className="space-y-2">
            <Label>Song Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(songTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Structure: {songTemplates[selectedTemplate as keyof typeof songTemplates].structure.join(" → ")}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Select Beat</Label>
            <Tabs defaultValue="library" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="library">Your Library</TabsTrigger>
                <TabsTrigger value="upload">Upload New</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="space-y-4">
                <div className="grid gap-3">
                  {loading ? (
                    <div className="text-center py-4">Loading beats...</div>
                  ) : libraryBeats.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No beats available in your library
                    </div>
                  ) : (
                    libraryBeats.map((beat) => (
                      <Card 
                        key={beat.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedBeat?.id === beat.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleLibrarySelect(beat)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{beat.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {beat.genre} • {beat.bpm} BPM
                              </p>
                            </div>
                            <Music className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Upload your beat file</p>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                  {uploadedFile && (
                    <p className="text-sm text-primary mt-2">Selected: {uploadedFile.name}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="marketplace" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4" />
                  <Input placeholder="Search marketplace beats..." />
                </div>
                <div className="grid gap-3">
                  {marketplaceBeats.map((beat) => (
                    <Card 
                      key={beat.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedBeat?.id === beat.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleMarketplaceSelect(beat)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{beat.name}</h4>
                            <p className="text-sm text-muted-foreground">{beat.genre} • {beat.bpm} BPM</p>
                          </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(beat.price)}</p>
                              <p className="text-xs text-muted-foreground">Buy Now</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSong}
              disabled={!songName || !selectedBeat}
            >
              Create Song
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewSongModal;