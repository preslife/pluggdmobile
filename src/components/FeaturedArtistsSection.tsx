import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Music, Users } from "lucide-react";
import { getCreatorIdFromArtistName } from "@/utils/artistCreatorMapping";
import { useNavigate } from "react-router-dom";

interface Artist {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  spotify_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

const FeaturedArtistsSection = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedArtists = async () => {
      try {
        const { data } = await supabase
          .from('artists')
          .select('*')
          .eq('is_featured', true)
          .limit(6);

        setArtists(data || []);
      } catch (error) {
        console.error('Error fetching featured artists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedArtists();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (artists.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Featured <span className="bg-gradient-primary bg-clip-text text-transparent">Artists</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the talent shaping the future of music on Pluggd
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artists.map((artist) => {
            const creatorId = getCreatorIdFromArtistName(artist.name);
            const handleClick = () => {
              if (creatorId) {
                navigate(`/creator/${creatorId}`);
              } else {
                navigate(`/artist/${artist.id}`);
              }
            };
            
            return (
            <Card 
              key={artist.id} 
              className="group hover:shadow-glow transition-all duration-300 bg-gradient-card border-accent/20 cursor-pointer"
              onClick={handleClick}
            >
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <img
                    src={artist.image_url}
                    alt={artist.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary/50 group-hover:border-primary transition-colors"
                  />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Music className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">{artist.name}</CardTitle>
                <Badge variant="secondary" className="w-fit mx-auto">
                  <Users className="w-3 h-3 mr-1" />
                  Featured Artist
                </Badge>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <CardDescription className="text-sm line-clamp-3">
                  {artist.bio}
                </CardDescription>
                
                <div className="flex justify-center space-x-2">
                  {artist.spotify_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Spotify
                      </a>
                    </Button>
                  )}
                  {artist.instagram_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Instagram
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/community">
            <Button variant="outline" size="lg">
              Discover More Artists
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtistsSection;