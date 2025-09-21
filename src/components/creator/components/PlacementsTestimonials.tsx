import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  Quote, 
  Trophy, 
  Music, 
  CheckCircle, 
  ExternalLink,
  Play,
  Award,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  author_name: string;
  author_avatar?: string;
  author_title?: string;
  content: string;
  rating: number;
  created_at: string;
  is_verified: boolean;
}

interface Placement {
  id: string;
  artist_name: string;
  track_title: string;
  platform?: string;
  achievement?: string;
  release_date?: string;
  artwork_url?: string;
  stream_url?: string;
}

interface PlacementsTestimonialsProps {
  creatorId: string;
}

/**
 * PlacementsTestimonials - Implements spec requirement for "Placements/Testimonials"
 * Shows social proof through successful placements and fan testimonials
 */
export const PlacementsTestimonials = ({ creatorId }: PlacementsTestimonialsProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [activeTab, setActiveTab] = useState<'testimonials' | 'placements'>('testimonials');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [creatorId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // In production, fetch from database
      // For now, use mock data
      const mockTestimonials: Testimonial[] = [
        {
          id: '1',
          author_name: 'Mike Johnson',
          author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
          author_title: 'Recording Artist',
          content: 'The beats from this producer are absolutely fire! Professional quality and great to work with. Highly recommend!',
          rating: 5,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_verified: true
        },
        {
          id: '2',
          author_name: 'Sarah Davis',
          author_title: 'Independent Artist',
          content: 'Amazing production quality and super easy licensing process. Got my track ready for release in no time!',
          rating: 5,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_verified: true
        },
        {
          id: '3',
          author_name: 'DJ Fresh',
          author_title: 'Music Producer',
          content: 'Collaborated on multiple projects. Always delivers top-tier beats and great communication throughout.',
          rating: 5,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_verified: false
        }
      ];

      const mockPlacements: Placement[] = [
        {
          id: '1',
          artist_name: 'Rising Star',
          track_title: 'Summer Vibes',
          platform: 'Spotify',
          achievement: '500K+ Streams',
          release_date: '2024-06-15',
          artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200'
        },
        {
          id: '2',
          artist_name: 'Urban Legend',
          track_title: 'City Lights',
          platform: 'Apple Music',
          achievement: 'Playlist Featured',
          release_date: '2024-08-20',
          artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200'
        },
        {
          id: '3',
          artist_name: 'The Collective',
          track_title: 'Breaking Through',
          platform: 'YouTube',
          achievement: '1M+ Views',
          release_date: '2024-09-01',
          artwork_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200'
        }
      ];
      
      setTestimonials(mockTestimonials);
      setPlacements(mockPlacements);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'fill-yellow-500 text-yellow-500' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Success Stories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Success Stories
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={activeTab === 'testimonials' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('testimonials')}
            >
              <Quote className="w-4 h-4 mr-1" />
              Reviews
            </Button>
            <Button
              variant={activeTab === 'placements' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('placements')}
            >
              <Award className="w-4 h-4 mr-1" />
              Placements
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'testimonials' ? (
          <div className="space-y-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={testimonial.author_avatar} />
                    <AvatarFallback>
                      {testimonial.author_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{testimonial.author_name}</h4>
                      {testimonial.is_verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    {testimonial.author_title && (
                      <p className="text-xs text-muted-foreground">{testimonial.author_title}</p>
                    )}
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-13">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
            
            {testimonials.length === 0 && (
              <div className="text-center py-6">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No reviews yet
                </p>
              </div>
            )}

            {testimonials.length > 0 && (
              <Button variant="outline" size="sm" className="w-full">
                View All Reviews ({testimonials.length}+)
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {placements.map((placement) => (
              <div key={placement.id} className="flex gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                {placement.artwork_url && (
                  <img 
                    src={placement.artwork_url} 
                    alt={placement.track_title}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{placement.track_title}</h4>
                  <p className="text-xs text-muted-foreground">
                    by {placement.artist_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {placement.achievement && (
                      <Badge variant="secondary" className="text-xs">
                        {placement.achievement}
                      </Badge>
                    )}
                    {placement.platform && (
                      <Badge variant="outline" className="text-xs">
                        <Music className="w-3 h-3 mr-1" />
                        {placement.platform}
                      </Badge>
                    )}
                    {placement.release_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(placement.release_date)}
                      </span>
                    )}
                  </div>
                </div>
                {placement.stream_url && (
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {placements.length === 0 && (
              <div className="text-center py-6">
                <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No placements yet
                </p>
              </div>
            )}

            {placements.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {placements.length}+ successful placements
                  </p>
                  <Button variant="default" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View All
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlacementsTestimonials;
