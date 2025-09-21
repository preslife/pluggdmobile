import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, targetType = 'releases', limit = 10, context } = await req.json();

    console.log('Generating recommendations for user:', userId, 'type:', targetType);

    // Mock user preferences and listening history
    const userProfile = {
      id: userId,
      favoriteGenres: ['Hip Hop', 'R&B', 'Electronic'],
      recentListens: [
        { releaseId: '1', genre: 'Hip Hop', rating: 5 },
        { releaseId: '2', genre: 'R&B', rating: 4 },
        { releaseId: '3', genre: 'Electronic', rating: 4 }
      ],
      followedArtists: ['artist1', 'artist2'],
      playlistGenres: ['Hip Hop', 'Trap', 'Lo-Fi'],
      timeOfDay: new Date().getHours()
    };

    // Recommendation algorithms
    const generateReleaseRecommendations = () => {
      const mockReleases = [
        {
          id: 'rec1',
          title: 'Midnight Vibes',
          artist: 'Night Producer',
          genre: 'Lo-Fi Hip Hop',
          score: 0.95,
          reason: 'Based on your late-night listening patterns',
          cover_art_url: null,
          preview_url: null,
          release_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'rec2',
          title: 'Synthwave Dreams',
          artist: 'Retro Master',
          genre: 'Electronic',
          score: 0.89,
          reason: 'Similar to your recent electronic favorites',
          cover_art_url: null,
          preview_url: null,
          release_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'rec3',
          title: 'Urban Flows',
          artist: 'City Beats',
          genre: 'Hip Hop',
          score: 0.87,
          reason: 'Popular among users with similar taste',
          cover_art_url: null,
          preview_url: null,
          release_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'rec4',
          title: 'Smooth Operator',
          artist: 'R&B King',
          genre: 'R&B',
          score: 0.84,
          reason: 'Trending in your preferred genres',
          cover_art_url: null,
          preview_url: null,
          release_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Apply collaborative filtering simulation
      return mockReleases
        .filter(release => userProfile.favoriteGenres.some(genre => release.genre.includes(genre)))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    };

    const generateArtistRecommendations = () => {
      return [
        {
          id: 'artist_rec1',
          name: 'Future Sounds',
          genre: 'Electronic Hip Hop',
          follower_count: 15420,
          score: 0.92,
          reason: 'Creates music similar to your favorites',
          avatar_url: null,
          latest_release: 'Digital Dreams'
        },
        {
          id: 'artist_rec2',
          name: 'Melody Maker',
          genre: 'R&B Soul',
          follower_count: 8930,
          score: 0.88,
          reason: 'Trending among R&B listeners',
          avatar_url: null,
          latest_release: 'Heartstrings'
        }
      ].slice(0, limit);
    };

    const generatePlaylistRecommendations = () => {
      const timeBasedPlaylists = userProfile.timeOfDay >= 22 || userProfile.timeOfDay <= 6
        ? ['Late Night Vibes', 'Midnight Sessions', 'After Hours']
        : ['Daily Motivation', 'Workout Energy', 'Focus Beats'];

      return timeBasedPlaylists.map((name, index) => ({
        id: `playlist_rec${index + 1}`,
        name,
        description: `Curated for your ${userProfile.timeOfDay >= 22 ? 'late night' : 'daytime'} listening`,
        track_count: Math.floor(Math.random() * 50) + 20,
        genre_focus: userProfile.favoriteGenres[index % userProfile.favoriteGenres.length],
        score: 0.9 - (index * 0.1),
        reason: 'Personalized based on your listening habits'
      }));
    };

    // Generate recommendations based on type
    let recommendations;
    let recommendationType = targetType;

    switch (targetType) {
      case 'releases':
        recommendations = generateReleaseRecommendations();
        break;
      case 'artists':
        recommendations = generateArtistRecommendations();
        break;
      case 'playlists':
        recommendations = generatePlaylistRecommendations();
        break;
      default:
        // Mixed recommendations
        recommendations = {
          releases: generateReleaseRecommendations().slice(0, 4),
          artists: generateArtistRecommendations().slice(0, 3),
          playlists: generatePlaylistRecommendations().slice(0, 3)
        };
        recommendationType = 'mixed';
        break;
    }

    // Add diversity and freshness factors
    const enhancedRecommendations = Array.isArray(recommendations)
      ? recommendations.map(item => ({
          ...item,
          factors: {
            popularity: Math.random(),
            freshness: Math.random(),
            diversity: Math.random(),
            personalFit: item.score
          },
          confidence: item.score * (0.8 + Math.random() * 0.2) // Add some variance
        }))
      : recommendations;

    const response = {
      success: true,
      userId,
      recommendationType,
      recommendations: enhancedRecommendations,
      metadata: {
        algorithm: 'collaborative_filtering_v2',
        generatedAt: new Date().toISOString(),
        contextFactors: {
          timeOfDay: userProfile.timeOfDay,
          recentActivity: userProfile.recentListens.length,
          genrePreferences: userProfile.favoriteGenres
        },
        modelVersion: '2.1.0'
      }
    };

    console.log('Recommendations generated:', {
      userId,
      type: recommendationType,
      count: Array.isArray(recommendations) ? recommendations.length : Object.keys(recommendations).length
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Recommendation generation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})