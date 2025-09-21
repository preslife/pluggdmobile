import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScheduledRelease = {
  id: string;
  title: string;
  artist: string;
  scheduled_publish_date: string;
  status: string;
  genre: string;
  description?: string;
  cover_art_url?: string;
};

const ReleaseScheduler = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledReleases, setScheduledReleases] = useState<ScheduledRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [newRelease, setNewRelease] = useState({
    title: '',
    artist: '',
    description: '',
    genre: '',
    scheduled_publish_date: new Date()
  });

  useEffect(() => {
    if (user) {
      fetchScheduledReleases();
    }
  }, [user]);

  const fetchScheduledReleases = async () => {
    try {
      // Mock data for demo
      const mockReleases: ScheduledRelease[] = [
        {
          id: '1',
          title: 'Future Hit',
          artist: 'Demo Artist',
          scheduled_publish_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          genre: 'Hip Hop',
          description: 'Upcoming release'
        }
      ];
      setScheduledReleases(mockReleases);
    } catch (error) {
      console.error('Error fetching scheduled releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleRelease = async () => {
    if (!user) return;

    try {
      toast({
        title: "Success!",
        description: "Release scheduled successfully (demo mode)."
      });

      setNewRelease({
        title: '',
        artist: '',
        description: '',
        genre: '',
        scheduled_publish_date: new Date()
      });
      setShowCreateForm(false);
      fetchScheduledReleases();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule release.",
        variant: "destructive"
      });
    }
  };

  const deleteScheduledRelease = async (releaseId: string) => {
    try {
      toast({
        title: "Success!",
        description: "Scheduled release deleted (demo mode)."
      });
      fetchScheduledReleases();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scheduled release.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Release Scheduler
          </h2>
          <p className="text-muted-foreground">Schedule releases for future publication</p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)} variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Release
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Schedule New Release</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newRelease.title}
                  onChange={(e) => setNewRelease({...newRelease, title: e.target.value})}
                  placeholder="Release title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Input
                  value={newRelease.artist}
                  onChange={(e) => setNewRelease({...newRelease, artist: e.target.value})}
                  placeholder="Artist name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Genre</label>
                <Select value={newRelease.genre} onValueChange={(value) => setNewRelease({...newRelease, genre: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                    <SelectItem value="R&B">R&B</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Electronic">Electronic</SelectItem>
                    <SelectItem value="Rock">Rock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Publish Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newRelease.description}
                onChange={(e) => setNewRelease({...newRelease, description: e.target.value})}
                placeholder="Release description"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={scheduleRelease} className="flex-1">Schedule Release</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Releases */}
      <div className="grid grid-cols-1 gap-4">
        {scheduledReleases.map((release) => (
          <Card key={release.id} className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      {release.cover_art_url ? (
                        <img src={release.cover_art_url} alt={release.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{release.title}</h3>
                      <p className="text-sm text-muted-foreground">{release.artist}</p>
                      <p className="text-xs text-muted-foreground">{release.genre}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm font-medium">
                    {format(new Date(release.scheduled_publish_date), "PPP")}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteScheduledRelease(release.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scheduledReleases.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No scheduled releases</h3>
          <p className="text-muted-foreground">Schedule your first release to get started.</p>
        </div>
      )}
    </div>
  );
};

export default ReleaseScheduler;