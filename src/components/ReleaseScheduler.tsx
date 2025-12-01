import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isBefore, isAfter, addDays } from 'date-fns';
import { CalendarIcon, Clock, Plus, Edit, Trash2, Music, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch releases with status 'scheduled' and a future scheduled_publish_date
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, artist, scheduled_publish_date, status, genre, description, cover_art_url')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .not('scheduled_publish_date', 'is', null)
        .order('scheduled_publish_date', { ascending: true });

      if (error) throw error;

      setScheduledReleases(data || []);
    } catch (error) {
      console.error('Error fetching scheduled releases:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled releases.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleRelease = async () => {
    if (!user || !selectedDate || !newRelease.title) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title and select a date.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('releases')
        .insert({
          user_id: user.id,
          title: newRelease.title,
          artist: newRelease.artist || 'Unknown Artist',
          description: newRelease.description,
          genre: newRelease.genre || 'Other',
          scheduled_publish_date: selectedDate.toISOString(),
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Release scheduled successfully."
      });

      setNewRelease({
        title: '',
        artist: '',
        description: '',
        genre: '',
        scheduled_publish_date: new Date()
      });
      setSelectedDate(undefined);
      setShowCreateForm(false);
      fetchScheduledReleases();
    } catch (error) {
      console.error('Error scheduling release:', error);
      toast({
        title: "Error",
        description: "Failed to schedule release.",
        variant: "destructive"
      });
    }
  };

  const publishNow = async (releaseId: string) => {
    if (!user) return;

    try {
      setUpdating(releaseId);
      
      const { error } = await supabase
        .from('releases')
        .update({ 
          status: 'published',
          scheduled_publish_date: null
        })
        .eq('id', releaseId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Published!",
        description: "Release is now live."
      });

      fetchScheduledReleases();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish release.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const deleteScheduledRelease = async (releaseId: string) => {
    if (!user) return;

    try {
      setDeleting(releaseId);
      
      // For scheduled releases, we set status to 'draft' instead of deleting
      const { error } = await supabase
        .from('releases')
        .update({ 
          status: 'draft',
          scheduled_publish_date: null
        })
        .eq('id', releaseId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Scheduled release moved to drafts."
      });

      fetchScheduledReleases();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel scheduled release.",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (release: ScheduledRelease) => {
    const scheduledDate = new Date(release.scheduled_publish_date);
    const now = new Date();
    
    if (isBefore(scheduledDate, now)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    
    if (isBefore(scheduledDate, addDays(now, 1))) {
      return <Badge variant="default" className="text-xs bg-amber-500">Today</Badge>;
    }
    
    if (isBefore(scheduledDate, addDays(now, 7))) {
      return <Badge variant="secondary" className="text-xs">This Week</Badge>;
    }
    
    return <Badge variant="outline" className="text-xs">Scheduled</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
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
        
        <div className="flex gap-2">
          <Link to="/studio/catalog">
            <Button variant="outline">
              <Music className="w-4 h-4 mr-2" />
              Full Catalog
            </Button>
          </Link>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Quick Schedule
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Tip: Schedule releases from the Catalog</p>
            <p className="text-xs text-muted-foreground mt-1">
              For full control over cover art, audio files, and pricing, upload your release in the Catalog module and set a scheduled publish date there.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Form (Quick Schedule) */}
      {showCreateForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Quick Schedule
            </CardTitle>
            <CardDescription>Create a placeholder release to schedule. You can edit details later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
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
                    <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                    <SelectItem value="Drill">Drill</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Publish Date *</label>
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
                      disabled={(date) => isBefore(date, new Date())}
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
                placeholder="Release description (optional)"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={scheduleRelease} className="flex-1">
                <Clock className="w-4 h-4 mr-2" />
                Schedule Release
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Releases */}
      {scheduledReleases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Upcoming Releases ({scheduledReleases.length})
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {scheduledReleases.map((release) => (
              <Card key={release.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {release.cover_art_url ? (
                          <img src={release.cover_art_url} alt={release.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{release.title}</h3>
                          {getStatusBadge(release)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{release.artist}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {release.genre && (
                            <Badge variant="outline" className="text-xs">{release.genre}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(release.scheduled_publish_date), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(release.scheduled_publish_date), "PPP")}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => publishNow(release.id)}
                          disabled={updating === release.id}
                        >
                          {updating === release.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Publish Now
                            </>
                          )}
                        </Button>
                        <Link to={`/studio/catalog/release/${release.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteScheduledRelease(release.id)}
                          disabled={deleting === release.id}
                        >
                          {deleting === release.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {scheduledReleases.length === 0 && !showCreateForm && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No scheduled releases</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your first release to build anticipation with your fans.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Quick Schedule
              </Button>
              <Link to="/studio/catalog">
                <Button variant="outline">
                  <Music className="w-4 h-4 mr-2" />
                  Upload Full Release
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReleaseScheduler;