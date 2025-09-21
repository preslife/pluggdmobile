import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Upload, Play, Edit, Trash2, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import BeatUploadForm from './BeatUploadForm';

interface Beat {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  is_published: boolean;
  created_at: string;
}

export const MyBeatsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBeats();
    }
  }, [user]);

  const fetchBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBeatPublication = async (beatId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('beats')
        .update({ is_published: !isPublished })
        .eq('id', beatId);

      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Beat ${!isPublished ? 'published' : 'unpublished'} successfully.`
      });
      
      fetchBeats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update beat status.",
        variant: "destructive"
      });
    }
  };

  if (showUploadForm) {
    return (
      <BeatUploadForm 
        onSuccess={() => {
          setShowUploadForm(false);
          fetchBeats();
        }}
        onCancel={() => setShowUploadForm(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Beats</h2>
          <p className="text-muted-foreground">Manage and upload your beats</p>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Beat
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Beats ({beats.length})</TabsTrigger>
          <TabsTrigger value="published">
            Published ({beats.filter(b => b.is_published).length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({beats.filter(b => !b.is_published).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {beats.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No beats uploaded yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start sharing your music with the community
                </p>
                <Button onClick={() => setShowUploadForm(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Beat
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {beats.map((beat) => (
                <Card key={beat.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{beat.title}</h3>
                          <p className="text-sm text-muted-foreground">{beat.genre} • {beat.bpm} BPM • {beat.key}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={beat.is_published ? "default" : "secondary"}>
                              {beat.is_published ? "Published" : "Draft"}
                            </Badge>
                            <span className="text-sm font-medium">${beat.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBeatPublication(beat.id, beat.is_published)}
                        >
                          {beat.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <div className="grid gap-4">
            {beats.filter(b => b.is_published).map((beat) => (
              <Card key={beat.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Music className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{beat.title}</h3>
                        <p className="text-sm text-muted-foreground">{beat.genre} • {beat.bpm} BPM • {beat.key}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="default">Published</Badge>
                          <span className="text-sm font-medium">${beat.price}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="grid gap-4">
            {beats.filter(b => !b.is_published).map((beat) => (
              <Card key={beat.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Music className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{beat.title}</h3>
                        <p className="text-sm text-muted-foreground">{beat.genre} • {beat.bpm} BPM • {beat.key}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary">Draft</Badge>
                          <span className="text-sm font-medium">${beat.price}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBeatPublication(beat.id, beat.is_published)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};