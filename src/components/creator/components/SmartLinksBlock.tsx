import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Music, Globe, Smartphone } from 'lucide-react';

interface CreatorProfile {
  social_links?: {
    spotify?: string;
    apple_music?: string;
    youtube?: string;
    soundcloud?: string;
  };
  website_url?: string;
}

interface SmartLinksBlockProps {
  profile: CreatorProfile;
}

export const SmartLinksBlock = ({ profile }: SmartLinksBlockProps) => {
  const links = [
    {
      name: 'Spotify',
      url: profile.social_links?.spotify,
      icon: '🎵',
      color: 'bg-green-500'
    },
    {
      name: 'Apple Music',
      url: profile.social_links?.apple_music,
      icon: '🍎',
      color: 'bg-red-500'
    },
    {
      name: 'YouTube',
      url: profile.social_links?.youtube,
      icon: '📺',
      color: 'bg-red-600'
    },
    {
      name: 'SoundCloud',
      url: profile.social_links?.soundcloud,
      icon: '☁️',
      color: 'bg-orange-500'
    }
  ].filter(link => link.url);

  if (links.length === 0 && !profile.website_url) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Quick Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.website_url && (
          <Button asChild variant="outline" className="w-full justify-between">
            <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Official Website
              </div>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
        
        {links.map((link) => (
          <Button key={link.name} asChild variant="outline" className="w-full justify-between">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center gap-2">
                <span className="text-sm">{link.icon}</span>
                <span>{link.name}</span>
              </div>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default SmartLinksBlock;