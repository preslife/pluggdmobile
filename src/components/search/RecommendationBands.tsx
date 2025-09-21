import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Users, Music, Disc, Heart, Play, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RecommendationBandsProps {
  userId?: string;
  activeTab: string;
}

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  type: 'music' | 'beat' | 'creator';
  image_url?: string;
  plays?: number;
  price?: number;
  trending?: boolean;
}

export const RecommendationBands = ({ userId, activeTab }: RecommendationBandsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, activeTab]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let data: Recommendation[] = [];

      if (activeTab === 'music') {
        // Fetch recommended releases
        const { data: releases } = await supabase
          .from('releases')
          .select('id, title, artist, genre, cover_art_url, total_plays, price')
          .eq('status', 'published')
          .order('total_plays', { ascending: false })
          .limit(6);

        data = releases?.map(release => ({
          id: release.id,
          title: release.title,
          artist: release.artist,
          genre: release.genre,
          type: 'music' as const,
          image_url: release.cover_art_url,
          plays: release.total_plays,
          price: release.price,
          trending: (release.total_plays || 0) > 1000
        })) || [];
      } else if (activeTab === 'beats') {
        // Fetch recommended beats
        const { data: beats } = await supabase
          .from('beats')
          .select('id, title, producer_name, genre, image_url, price')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6);

        data = beats?.map(beat => ({
          id: beat.id,
          title: beat.title,
          artist: beat.producer_name || 'Unknown',
          genre: beat.genre,
          type: 'beat' as const,
          image_url: beat.image_url,
          price: beat.price,
          trending: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) < new Date()
        })) || [];
      } else if (activeTab === 'creators') {
        // Fetch recommended creators
        const { data: creators } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url, bio')
          .not('username', 'is', null)
          .limit(6);

        data = creators?.map(creator => ({
          id: creator.user_id,
          title: creator.full_name || creator.username || 'Anonymous',
          artist: `@${creator.username}`,
          genre: 'Creator', // Could be enhanced with user's primary genre
          type: 'creator' as const,
          image_url: creator.avatar_url,
          trending: false
        })) || [];
      }

      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationTitle = () => {
    switch (activeTab) {
      case 'music': return 'Recommended for You';
      case 'beats': return 'Hot Beats';
      case 'creators': return 'Trending Creators';
      default: return 'Recommendations';
    }
  };

  const getRecommendationIcon = () => {
    switch (activeTab) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'beats': return <Disc className="w-4 h-4" />;
      case 'creators': return <Users className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getLinkPath = (recommendation: Recommendation) => {
    switch (recommendation.type) {
      case 'music': return `/release/${recommendation.id}`;
      case 'beat': return `/beat/${recommendation.id}`;
      case 'creator': return `/profile/${recommendation.artist.replace('@', '')}`;
      default: return '#';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main Recommendations Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {getRecommendationIcon()}
            {getRecommendationTitle()}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'music' && "Based on your listening history"}
            {activeTab === 'beats' && "Trending in your genre"}
            {activeTab === 'creators' && "Connect with these artists"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.slice(0, 4).map((item) => (
            <div key={item.id} className="group">
              <Link to={getLinkPath(item)}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                        {getRecommendationIcon()}
                      </div>
                    )}
                    {item.trending && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{item.artist}</span>
                      {item.genre && (
                        <>
                          <span>•</span>
                          <span>{item.genre}</span>
                        </>
                      )}
                    </div>
                    {item.plays && (
                      <div className="text-xs text-muted-foreground">
                        {item.plays.toLocaleString()} plays
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.price !== undefined && (
                      <div className="text-xs font-medium">
                        {item.price === 0 ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">Free</Badge>
                        ) : (
                          <span>£{item.price.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Heart className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Popular This Week */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Popular This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.slice(4, 6).map((item, index) => (
            <div key={item.id} className="group">
              <Link to={getLinkPath(item)}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Action */}
      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <h4 className="font-semibold mb-2">Discover More</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Explore our full catalog of premium content
          </p>
          <Button size="sm" className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
            <Star className="w-4 h-4 mr-2" />
            Browse All {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};