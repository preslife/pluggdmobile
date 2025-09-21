import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music, Users, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

type ArtistProfile = {
  user_id: string;
  full_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  user_type: string;
  location: string;
  genres: string[];
  social_links: any;
  follower_count: number;
  following_count: number;
  release_count: number;
};

const CommunityArtists = () => {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          username,
          bio,
          avatar_url,
          user_type
        `)
        .in('user_type', ['artist', 'producer'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add mock data for demo
      const artistsWithCounts = data ? data.map(artist => ({
        user_id: artist.user_id,
        full_name: artist.full_name,
        username: artist.username,
        bio: artist.bio,
        avatar_url: artist.avatar_url,
        user_type: artist.user_type,
        location: 'Demo Location',
        genres: ['Hip Hop', 'R&B'],
        social_links: {},
        follower_count: Math.floor(Math.random() * 1000),
        following_count: Math.floor(Math.random() * 500),
        release_count: Math.floor(Math.random() * 20)
      })) : [];

      setArtists(artistsWithCounts);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = artists.filter(artist => {
    if (selectedGenre === 'all') return true;
    return artist.genres?.includes(selectedGenre);
  });

  const allGenres = Array.from(new Set(artists.flatMap(artist => artist.genres || [])));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-gradient-card border-border animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 w-16 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
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
          <h2 className="text-2xl font-bold">Community Artists</h2>
          <p className="text-muted-foreground">Discover talented creators in our community</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedGenre === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedGenre('all')}
          >
            All
          </Button>
          {allGenres.slice(0, 5).map(genre => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Artists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArtists.map((artist) => (
          <Card key={artist.user_id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group">
            <CardHeader className="text-center">
              <Avatar className="w-16 h-16 mx-auto mb-4">
                <AvatarImage src={artist.avatar_url} alt={artist.full_name} />
                <AvatarFallback>{artist.full_name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">{artist.full_name || artist.username}</CardTitle>
              <Badge variant="secondary" className="mx-auto">
                {artist.user_type}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {artist.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {artist.bio}
                </p>
              )}
              
              {artist.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {artist.location}
                </div>
              )}

              {artist.genres && artist.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {artist.genres.slice(0, 3).map(genre => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {artist.follower_count} followers
                </div>
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  {artist.release_count} releases
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={artist.username ? `/creator/${artist.username}` : `/user/${artist.user_id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </Link>
                <Button variant="default" size="sm" className="flex-1">
                  Follow
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredArtists.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No artists found</h3>
          <p className="text-muted-foreground">
            {selectedGenre === 'all' 
              ? "No artists have joined the community yet." 
              : `No artists found for "${selectedGenre}" genre.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default CommunityArtists;