import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type UpcomingRelease = {
  id: string;
  title: string;
  artist: string;
  cover_art_url?: string;
  release_date: string;
  scheduled_publish_date?: string;
  genre?: string;
};

const UpcomingReleases = () => {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingReleases();
  }, []);

  const fetchUpcomingReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, artist, cover_art_url, release_date, scheduled_publish_date, genre')
        .eq('status', 'scheduled')
        .gt('scheduled_publish_date', new Date().toISOString())
        .eq('approved', true)
        .order('scheduled_publish_date', { ascending: true })
        .limit(6);

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching upcoming releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilRelease = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diff = release.getTime() - now.getTime();
    
    if (diff <= 0) return "Available now";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    }
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Upcoming Releases</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (releases.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Upcoming Releases
          </h2>
          <p className="text-muted-foreground mt-2">
            Get ready for these exciting new releases
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {releases.map((release) => (
            <Card key={release.id} className="group hover:shadow-lg transition-all duration-300">
              <div className="relative overflow-hidden rounded-t-lg">
                {release.cover_art_url ? (
                  <img
                    src={release.cover_art_url}
                    alt={`${release.title} by ${release.artist}`}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeUntilRelease(release.scheduled_publish_date || release.release_date)}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                  {release.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-2">
                  by {release.artist}
                </p>
                {release.genre && (
                  <Badge variant="outline" className="text-xs mb-3">
                    {release.genre}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Releases {new Date(release.scheduled_publish_date || release.release_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link to="/releases">
            <Button variant="outline">
              View All Releases
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UpcomingReleases;