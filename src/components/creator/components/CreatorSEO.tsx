import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { buildEntityOgImageUrl } from '@/lib/og';

interface CreatorProfile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url?: string;
  cover_image_url?: string;
  website_url?: string;
  location?: string;
  genres?: string[];
  is_verified?: boolean;
  social_links?: {
    instagram?: string;
    twitter?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
    tiktok?: string;
  };
}

interface CreatorStats {
  total_followers: number;
  total_plays: number;
  total_releases: number;
  monthly_listeners: number;
}

interface CreatorSEOProps {
  profile: CreatorProfile;
  stats?: CreatorStats;
}

/**
 * CreatorSEO - Implements spec requirement for "SEO Person/MusicGroup schema"
 * Adds structured data for better search engine visibility
 */
export const CreatorSEO = ({ profile, stats }: CreatorSEOProps) => {
  const baseUrl = window.location.origin;
  const creatorUrl = `${baseUrl}/creator/${profile.username}`;
  const ogImage = profile.username
    ? buildEntityOgImageUrl('profile', profile.username, { resourceUrl: creatorUrl })
    : profile.cover_image_url || profile.avatar_url || `${baseUrl}/og-default.png`;
  
  // Build Person/MusicGroup schema
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicGroup", // or "Person" for solo artists
    "name": profile.full_name,
    "alternateName": profile.username,
    "description": profile.bio,
    "url": creatorUrl,
    "image": profile.avatar_url || `${baseUrl}/placeholder.svg`,
    "genre": profile.genres?.join(', ') || "Music",
    ...(profile.location && { "address": { "@type": "PostalAddress", "addressLocality": profile.location } }),
    
    // Social media profiles
    "sameAs": [
      profile.website_url,
      profile.social_links?.instagram && `https://instagram.com/${profile.social_links.instagram}`,
      profile.social_links?.twitter && `https://twitter.com/${profile.social_links.twitter}`,
      profile.social_links?.youtube && `https://youtube.com/${profile.social_links.youtube}`,
      profile.social_links?.spotify && `https://open.spotify.com/artist/${profile.social_links.spotify}`,
      profile.social_links?.soundcloud && `https://soundcloud.com/${profile.social_links.soundcloud}`,
      profile.social_links?.tiktok && `https://tiktok.com/@${profile.social_links.tiktok}`
    ].filter(Boolean),
    
    // Performance metrics
    ...(stats && {
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction",
          "userInteractionCount": stats.total_followers
        },
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/ListenAction",
          "userInteractionCount": stats.total_plays
        }
      ]
    }),
    
    // Verification status
    ...(profile.is_verified && {
      "award": "Verified Creator"
    }),
    
    // Music releases
    ...(stats?.total_releases && {
      "track": {
        "@type": "ItemList",
        "numberOfItems": stats.total_releases
      }
    })
  };

  // Open Graph tags for social media sharing
  const ogTags = {
    title: `${profile.full_name} (@${profile.username}) | Pluggd`,
    description: profile.bio || `Check out ${profile.full_name}'s music, beats, and exclusive content on Pluggd`,
    image: ogImage,
    url: creatorUrl,
    type: 'profile'
  };

  // Twitter Card tags
  const twitterTags = {
    card: 'summary_large_image',
    site: '@pluggd',
    creator: profile.social_links?.twitter ? `@${profile.social_links.twitter}` : '@pluggd',
    title: ogTags.title,
    description: ogTags.description,
    image: ogTags.image
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{ogTags.title}</title>
      <meta name="description" content={ogTags.description} />
      <link rel="canonical" href={creatorUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={ogTags.title} />
      <meta property="og:description" content={ogTags.description} />
      <meta property="og:image" content={ogTags.image} />
      <meta property="og:url" content={ogTags.url} />
      <meta property="og:type" content={ogTags.type} />
      <meta property="og:site_name" content="Pluggd" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterTags.card} />
      <meta name="twitter:site" content={twitterTags.site} />
      <meta name="twitter:creator" content={twitterTags.creator} />
      <meta name="twitter:title" content={twitterTags.title} />
      <meta name="twitter:description" content={twitterTags.description} />
      <meta name="twitter:image" content={twitterTags.image} />
      
      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={profile.full_name} />
      {profile.genres && profile.genres.length > 0 && (
        <meta name="keywords" content={`${profile.genres.join(', ')}, music, beats, producer, ${profile.username}`} />
      )}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default CreatorSEO;
