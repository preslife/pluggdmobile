import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import {
  MapPin,
  Calendar,
  ExternalLink,
  Music,
  Star,
  Trophy,
  Users,
  Heart,
  Play,
  Award,
  Target,
  Lightbulb,
  Mic,
  Headphones
} from 'lucide-react';

interface CreatorProfile {
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  location?: string;
  genres?: string[];
  website_url?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
    tiktok?: string;
    twitch?: string;
  };
  created_at: string;
}

interface CreatorStats {
  total_followers: number;
  total_plays: number;
  total_releases: number;
  supporter_count: number;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface AboutTabProps {
  profile: CreatorProfile;
  stats: CreatorStats | null;
  visitorStatus: VisitorStatus | null;
}

export const AboutTab = ({ profile, stats, visitorStatus }: AboutTabProps) => {
  const getSocialLinks = () => {
    if (!profile.social_links) return [];
    
    const socialPlatforms = [
      { key: 'spotify', icon: '🎵', name: 'Spotify', color: 'bg-green-500' },
      { key: 'instagram', icon: '📷', name: 'Instagram', color: 'bg-pink-500' },
      { key: 'twitter', icon: '🐦', name: 'Twitter', color: 'bg-blue-500' },
      { key: 'youtube', icon: '📺', name: 'YouTube', color: 'bg-red-500' },
      { key: 'tiktok', icon: '🎬', name: 'TikTok', color: 'bg-black' },
      { key: 'twitch', icon: '🟣', name: 'Twitch', color: 'bg-purple-500' },
      { key: 'soundcloud', icon: '☁️', name: 'SoundCloud', color: 'bg-orange-500' }
    ];

    return socialPlatforms
      .filter(platform => profile.social_links?.[platform.key as keyof typeof profile.social_links])
      .map(platform => ({
        ...platform,
        url: profile.social_links![platform.key as keyof typeof profile.social_links]
      }));
  };

  const getCareerHighlights = () => {
    // In a real app, this would come from the database
    const highlights = [];
    
    if (stats?.total_plays && stats.total_plays > 10000) {
      highlights.push({
        icon: Play,
        title: 'Viral Track',
        description: `${stats.total_plays.toLocaleString()} total plays`,
        color: 'text-green-500'
      });
    }

    if (stats?.total_followers && stats.total_followers > 1000) {
      highlights.push({
        icon: Users,
        title: 'Growing Fanbase',
        description: `${stats.total_followers.toLocaleString()} followers`,
        color: 'text-blue-500'
      });
    }

    if (stats?.supporter_count && stats.supporter_count > 10) {
      highlights.push({
        icon: Heart,
        title: 'Supported Creator',
        description: `${stats.supporter_count} active supporters`,
        color: 'text-pink-500'
      });
    }

    return highlights;
  };

  const getCreatorJourney = () => {
    const joinYear = new Date(profile.created_at).getFullYear();
    const yearsActive = new Date().getFullYear() - joinYear;
    
    return {
      joinYear,
      yearsActive: yearsActive > 0 ? yearsActive : 1,
      releaseCount: stats?.total_releases || 0
    };
  };

  const socialLinks = getSocialLinks();
  const highlights = getCareerHighlights();
  const journey = getCreatorJourney();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bio & Description */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              About {profile.full_name || profile.username}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.bio ? (
              <p className="text-muted-foreground leading-relaxed">
                {profile.bio}
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                This creator hasn't added a bio yet.
              </p>
            )}

            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  Creator since {journey.joinYear} • {journey.yearsActive} year{journey.yearsActive !== 1 ? 's' : ''} active
                </span>
              </div>

              {profile.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Music className="w-4 h-4 text-muted-foreground" />
                <span>{journey.releaseCount} releases published</span>
              </div>
            </div>

            {/* Genres */}
            {profile.genres && profile.genres.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Musical Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.genres.map(genre => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      <Headphones className="w-3 h-3 mr-1" />
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Career Highlights */}
        {highlights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Career Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highlights.map((highlight, index) => {
                  const IconComponent = highlight.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <IconComponent className={`w-5 h-5 ${highlight.color}`} />
                      <div>
                        <h4 className="font-medium text-sm">{highlight.title}</h4>
                        <p className="text-xs text-muted-foreground">{highlight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Links & Contact */}
      <div className="space-y-6">
        {/* Social Links */}
        {socialLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${social.color} flex items-center justify-center text-white text-sm`}>
                        {social.icon}
                      </div>
                      <span className="font-medium">{social.name}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                ))}

                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                        🌐
                      </div>
                      <span className="font-medium">Website</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Creator Stats */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Creator Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <div className="text-2xl font-bold text-primary">{stats.total_followers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <div className="text-2xl font-bold text-primary">{stats.total_plays.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Plays</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <div className="text-2xl font-bold text-primary">{stats.total_releases}</div>
                  <div className="text-xs text-muted-foreground">Releases</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <div className="text-2xl font-bold text-primary">{stats.supporter_count}</div>
                  <div className="text-xs text-muted-foreground">Supporters</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Creator Mission/Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Creator Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {profile.full_name || profile.username} is dedicated to creating authentic music that resonates with fans worldwide. 
                Through consistent releases and community engagement, they're building a lasting impact in the music industry.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  Authentic Artist
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Community Builder
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Quality First
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutTab;