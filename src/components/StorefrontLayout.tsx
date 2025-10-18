import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import { formatCurrency } from "@/lib/utils";
import {
  Play,
  Pause,
  Music,
  ShoppingCart,
  Heart,
  Share2,
  Download,
  ExternalLink,
  MapPin,
  Calendar,
  Users,
  Star,
  Verified,
  Music2,
  Headphones,
  TrendingUp
} from "lucide-react";
import { ActivityTab } from "./Storefront/ActivityTab";

interface StorefrontProps {
  userId: string;
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    banner_url?: string | null;
    location?: string | null;
    is_verified?: boolean;
    follower_count?: number;
    total_plays?: number;
    total_sales?: number;
    genres?: string[];
    social_links?: {
      website?: string;
      instagram?: string;
      twitter?: string;
      spotify?: string;
      youtube?: string;
    };
  };
  beats: any[];
  releases: any[];
  stats: {
    total_plays: number;
    total_sales: number;
    monthly_listeners: number;
    fan_funding_raised: number;
  };
}

interface TrackGridProps {
  tracks: any[];
  title: string;
  type: 'beat' | 'release';
}

const TrackGrid = ({ tracks, title, type }: TrackGridProps) => {
  const { state, actions } = useGlobalPlayer();

  const handlePlayTrack = (track: any) => {
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || "Unknown Artist",
      src: track.audio_url,
      artwork: track.image_url || track.cover_art_url,
      userId: track.user_id,
      type: type
    };
    
    // Set queue and play
    const allTracks = tracks
      .filter(t => t.audio_url)
      .map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist || "Unknown Artist",
        src: t.audio_url,
        artwork: t.image_url || t.cover_art_url,
        userId: t.user_id,
        type: type
      }));
    
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    actions.setQueue(allTracks, trackIndex >= 0 ? trackIndex : 0);
    actions.play(audioTrack);
  };

  if (!tracks || tracks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Music2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {title.toLowerCase()} available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        {tracks.length > 6 && (
          <Button variant="ghost" size="sm">
            View All <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.slice(0, 6).map((track) => {
          const isCurrentTrack = state.currentTrack?.id === track.id;
          const isPlaying = isCurrentTrack && state.isPlaying;
          
          return (
            <Card key={track.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-t-lg overflow-hidden">
                  {track.image_url || track.cover_art_url ? (
                    <img 
                      src={track.image_url || track.cover_art_url} 
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-t-lg flex items-center justify-center">
                  <Button
                    onClick={() => handlePlayTrack(track)}
                    size="lg"
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full h-14 w-14 p-0 bg-primary/90 hover:bg-primary"
                    disabled={!track.audio_url}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                
                {/* Status indicators */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {track.featured && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {track.is_exclusive && (
                    <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500">
                      Exclusive
                    </Badge>
                  )}
                </div>
                
                {/* Price */}
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                    {track.price === 0 ? 'Free' : formatCurrency(track.price)}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {track.genre && <span>{track.genre}</span>}
                    {track.bpm && (
                      <>
                        <span>•</span>
                        <span>{track.bpm} BPM</span>
                      </>
                    )}
                    {track.key && (
                      <>
                        <span>•</span>
                        <span>{track.key}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                {(track.play_count || track.purchase_count) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {track.play_count && (
                      <div className="flex items-center gap-1">
                        <Headphones className="h-3 w-3" />
                        <span>{track.play_count}</span>
                      </div>
                    )}
                    {track.purchase_count && (
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        <span>{track.purchase_count}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Tags */}
                {track.tags && track.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {track.tags.slice(0, 3).map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {track.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{track.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handlePlayTrack(track)}
                    disabled={!track.audio_url}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Playing
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  
                  {track.price > 0 && (
                    <Button size="sm" variant="outline">
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Buy
                    </Button>
                  )}
                  
                  <Button size="sm" variant="ghost" className="p-2">
                    <Heart className="h-3 w-3" />
                  </Button>
                  
                  <Button size="sm" variant="ghost" className="p-2">
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const StorefrontLayout = ({ userId, profile, beats, releases, stats }: StorefrontProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-80 overflow-hidden">
        {profile.banner_url ? (
          <img 
            src={profile.banner_url} 
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.charAt(0) || profile.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {profile.full_name || profile.username || "Anonymous Creator"}
                  </h1>
                  {profile.is_verified && (
                    <Verified className="h-6 w-6 text-blue-500 fill-current" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  {profile.username && (
                    <span>@{profile.username}</span>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.genres && profile.genres.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Music className="h-4 w-4" />
                      <span>{profile.genres.join(", ")}</span>
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{stats.monthly_listeners.toLocaleString()}</span>
                    <span className="text-muted-foreground">monthly listeners</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">{stats.total_plays.toLocaleString()}</span>
                    <span className="text-muted-foreground">total plays</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">{stats.total_sales.toLocaleString()}</span>
                    <span className="text-muted-foreground">sales</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-end gap-3 pb-2">
                <Button size="lg">
                  <Heart className="h-4 w-4 mr-2" />
                  Follow
                </Button>
                <Button size="lg" variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(profile.social_links).map(([platform, url]) => (
                    <Button key={platform} variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support This Artist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <Heart className="h-4 w-4 mr-2" />
                  Become a Fan
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {formatCurrency(stats.fan_funding_raised)} raised by fans
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-3 space-y-8">
            <Tabs defaultValue="music" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="music">Music</TabsTrigger>
                <TabsTrigger value="beats">Beats</TabsTrigger>
                <TabsTrigger value="releases">Releases</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="music" className="space-y-8 mt-6">
                <TrackGrid tracks={[...releases, ...beats].slice(0, 6)} title="Latest Tracks" type="release" />
              </TabsContent>
              
              <TabsContent value="beats" className="space-y-8 mt-6">
                <TrackGrid tracks={beats} title="Beats & Instrumentals" type="beat" />
              </TabsContent>
              
              <TabsContent value="releases" className="space-y-8 mt-6">
                <TrackGrid tracks={releases} title="Releases & Albums" type="release" />
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-8 mt-6">
                <ActivityTab userId={userId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};