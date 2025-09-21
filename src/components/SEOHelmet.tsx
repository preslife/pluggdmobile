import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

type SEOConfig = {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  structuredData?: object;
  additionalTags?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
};

type SEOHelmetProps = {
  config: SEOConfig;
  releaseData?: {
    title: string;
    artist: string;
    description?: string;
    cover_art_url?: string;
    genre?: string;
    release_date?: string;
    duration?: number;
    price?: number;
  };
  artistData?: {
    name: string;
    bio?: string;
    image_url?: string;
    follower_count?: number;
    genres?: string[];
  };
};

const SEOHelmet = ({ config, releaseData, artistData }: SEOHelmetProps) => {
  const location = useLocation();
  const [canonicalUrl, setCanonicalUrl] = useState('');

  useEffect(() => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${location.pathname}`;
    setCanonicalUrl(config.canonical || fullUrl);
  }, [location.pathname, config.canonical]);

  // Generate structured data based on content type
  const generateStructuredData = () => {
    const baseStructure = {
      "@context": "https://schema.org",
      "@graph": []
    };

    // Website/Organization data
    const organizationData = {
      "@type": "Organization",
      "@id": `${window.location.origin}/#organization`,
      "name": "Pluggd",
      "description": "Premier music platform for artists, producers, and music lovers",
      "url": window.location.origin,
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/logo.png`
      },
      "sameAs": [
        "https://twitter.com/pluggd",
        "https://instagram.com/pluggd",
        "https://facebook.com/pluggd"
      ]
    };

    // Website data
    const websiteData = {
      "@type": "WebSite",
      "@id": `${window.location.origin}/#website`,
      "url": window.location.origin,
      "name": "Pluggd",
      "description": "Premier music platform for artists, producers, and music lovers",
      "publisher": {
        "@id": `${window.location.origin}/#organization`
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${window.location.origin}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    baseStructure["@graph"].push(organizationData, websiteData);

    // Release-specific structured data
    if (releaseData) {
      const musicRecording = {
        "@type": "MusicRecording",
        "@id": `${canonicalUrl}#recording`,
        "name": releaseData.title,
        "byArtist": {
          "@type": "MusicGroup",
          "name": releaseData.artist
        },
        "description": releaseData.description,
        "genre": releaseData.genre,
        "datePublished": releaseData.release_date,
        "duration": releaseData.duration ? `PT${releaseData.duration}S` : undefined,
        "image": releaseData.cover_art_url,
        "url": canonicalUrl,
        "offers": releaseData.price ? {
          "@type": "Offer",
          "price": (releaseData.price / 100).toFixed(2),
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock"
        } : undefined
      };
      baseStructure["@graph"].push(musicRecording);
    }

    // Artist-specific structured data
    if (artistData) {
      const musicGroup = {
        "@type": "MusicGroup",
        "@id": `${canonicalUrl}#artist`,
        "name": artistData.name,
        "description": artistData.bio,
        "image": artistData.image_url,
        "url": canonicalUrl,
        "genre": artistData.genres,
        "interactionStatistic": artistData.follower_count ? {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction",
          "userInteractionCount": artistData.follower_count
        } : undefined
      };
      baseStructure["@graph"].push(musicGroup);
    }

    return config.structuredData || baseStructure;
  };

  // Generate meta title
  const getMetaTitle = () => {
    if (config.title) return config.title;
    
    if (releaseData) {
      return `${releaseData.title} by ${releaseData.artist} | Pluggd`;
    }
    
    if (artistData) {
      return `${artistData.name} | Artist Profile | Pluggd`;
    }
    
    return 'Pluggd - Premier Music Platform';
  };

  // Generate meta description
  const getMetaDescription = () => {
    if (config.description) return config.description;
    
    if (releaseData) {
      return `Listen to "${releaseData.title}" by ${releaseData.artist} on Pluggd. ${releaseData.description || 'Discover amazing music from independent artists.'}`;
    }
    
    if (artistData) {
      return `Discover ${artistData.name} on Pluggd. ${artistData.bio || 'Follow for the latest releases and updates.'} ${artistData.follower_count ? `${artistData.follower_count} followers.` : ''}`;
    }
    
    return 'Discover, stream, and support independent music artists on Pluggd. The premier platform for music discovery and artist promotion.';
  };

  // Generate keywords
  const getKeywords = () => {
    const baseKeywords = ['music', 'streaming', 'artists', 'discover', 'pluggd'];
    
    if (config.keywords) {
      return [...baseKeywords, ...config.keywords].join(', ');
    }
    
    if (releaseData) {
      const releaseKeywords = [
        releaseData.artist.toLowerCase(),
        releaseData.title.toLowerCase(),
        releaseData.genre?.toLowerCase(),
        'music streaming',
        'independent music'
      ].filter(Boolean);
      return [...baseKeywords, ...releaseKeywords].join(', ');
    }
    
    if (artistData) {
      const artistKeywords = [
        artistData.name.toLowerCase(),
        ...(artistData.genres || []).map(g => g.toLowerCase()),
        'artist profile',
        'music artist'
      ];
      return [...baseKeywords, ...artistKeywords].join(', ');
    }
    
    return baseKeywords.join(', ');
  };

  // Generate Open Graph image
  const getOGImage = () => {
    if (config.ogImage) return config.ogImage;
    if (releaseData?.cover_art_url) return releaseData.cover_art_url;
    if (artistData?.image_url) return artistData.image_url;
    return `${window.location.origin}/og-default.jpg`;
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{getMetaTitle()}</title>
      <meta name="description" content={getMetaDescription()} />
      <meta name="keywords" content={getKeywords()} />
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={getMetaTitle()} />
      <meta property="og:description" content={getMetaDescription()} />
      <meta property="og:type" content={config.ogType || 'website'} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={getOGImage()} />
      <meta property="og:site_name" content="Pluggd" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@pluggd" />
      <meta name="twitter:title" content={getMetaTitle()} />
      <meta name="twitter:description" content={getMetaDescription()} />
      <meta name="twitter:image" content={getOGImage()} />
      
      {/* Music-specific meta tags */}
      {releaseData && (
        <>
          <meta property="music:musician" content={releaseData.artist} />
          <meta property="music:release_date" content={releaseData.release_date} />
          <meta property="music:duration" content={releaseData.duration?.toString()} />
        </>
      )}
      
      {/* Additional custom tags */}
      {config.additionalTags?.map((tag, index) => (
        <meta
          key={index}
          {...(tag.name ? { name: tag.name } : {})}
          {...(tag.property ? { property: tag.property } : {})}
          content={tag.content}
        />
      ))}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
      
      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Music streaming app meta tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Pluggd" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default SEOHelmet;