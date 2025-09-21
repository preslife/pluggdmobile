import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ArtistCard } from "@/components/ArtistCard";
import { VideoCard } from "@/components/VideoCard";
import { ContactForm } from "@/components/ContactForm";
import { MailingListForm } from "@/components/MailingListForm";
import { ReleasePreviewPlayer } from "@/components/ReleasePreviewPlayer";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import spotifyIcon from "@/assets/spotify-icon.svg";
import appleMusicIcon from "@/assets/apple-music-icon.svg";
import youtubeIcon from "@/assets/youtube-icon.svg";
import soundcloudIcon from "@/assets/soundcloud-icon.svg";

interface Release {
  id: string;
  title: string;
  artist: string;
  description: string;
  release_date: string;
  cover_art_url: string;
  spotify_url: string;
  apple_music_url: string;
  youtube_url: string;
  soundcloud_url: string;
  genre: string;
  is_featured: boolean;
  download_url: string;
  download_price: number;
  featured_artist: string;
  preview_url: string;
}

interface Artist {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  is_featured: boolean;
}

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url?: string;
  artist_id?: string;
  is_featured: boolean;
}

interface StoreProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  product_type: string;
}

const Label = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [featuredReleases, setFeaturedReleases] = useState<Release[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [releasesRes, artistsRes, videosRes, storeRes] = await Promise.all([
        supabase.from('releases').select('*').order('release_date', { ascending: false }),
        supabase.from('artists').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('store_products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6)
      ]);

      if (releasesRes.error) throw releasesRes.error;
      if (artistsRes.error) throw artistsRes.error;
      if (videosRes.error) throw videosRes.error;
      if (storeRes.error) throw storeRes.error;

      const allReleases = releasesRes.data || [];
      setReleases(allReleases);
      setFeaturedReleases(allReleases.filter(release => release.is_featured));
      setArtists(artistsRes.data || []);
      setVideos(videosRes.data || []);
      setStoreProducts(storeRes.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredReleases.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredReleases.length) % featuredReleases.length);
  };

  const handlePreviewPlay = (releaseId: string) => {
    setCurrentlyPlaying(releaseId);
  };

  const handlePreviewPause = () => {
    setCurrentlyPlaying(null);
  };

  const StreamingLinks = ({ release }: { release: Release }) => (
    <div className="flex gap-3">
      {release.spotify_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={release.spotify_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={spotifyIcon} 
              alt="Spotify" 
              className="w-6 h-6" 
            />
          </a>
        </Button>
      )}
      {release.apple_music_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={release.apple_music_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={appleMusicIcon} 
              alt="Apple Music" 
              className="w-6 h-6" 
            />
          </a>
        </Button>
      )}
      {release.youtube_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={release.youtube_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={youtubeIcon} 
              alt="YouTube" 
              className="w-6 h-6" 
            />
          </a>
        </Button>
      )}
      {release.soundcloud_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={soundcloudIcon} 
              alt="SoundCloud" 
              className="w-6 h-6" 
            />
          </a>
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <DomainAwareNavigation />
      
      {/* Label Header */}
      <header className="fixed top-16 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/212db52d-c929-4ab8-bd60-8522a6391187.png" 
              alt="9X Music Logo" 
              className="h-8 w-auto"
            />
          </div>
          <nav className="hidden md:flex space-x-8 text-sm uppercase tracking-wide">
            <a href="#store" className="text-gold hover:text-white transition-colors">Store</a>
            <a href="#artists" className="text-gold hover:text-white transition-colors">Artists</a>
            <a href="#videos" className="text-gold hover:text-white transition-colors">Videos</a>
            <a href="#contact" className="text-gold hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Carousel */}
      {featuredReleases.length > 0 && (
        <section className="relative h-screen overflow-hidden pt-32">
          <div className="relative w-full h-full">
            {featuredReleases.map((release, index) => (
              <div
                key={release.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={release.cover_art_url || '/placeholder.svg'}
                    alt={`${release.title} background`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-center">
                  <div className="max-w-6xl mx-auto px-6 w-full">
                     <div className="max-w-2xl">
                      <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                        The Sound of the Future.
                      </h1>
                      <h2 className="text-4xl md:text-6xl font-bold mb-6 text-gold">
                        The Legacy of Now.
                      </h2>
                      <p className="text-xl md:text-2xl mb-8 text-white/90">
                        Step inside the official label home of 9X — where game-changing music, global culture, and next-gen talent collide.
                      </p>
                      <div className="flex items-center gap-4">
                        <Button 
                          className="bg-gold text-black hover:bg-gold/90 rounded-full px-8 py-3 text-sm uppercase tracking-wide font-medium"
                          onClick={() => navigate(`/release/${release.id}`)}
                        >
                          listen now
                        </Button>
                        {release.download_url && Number(release.download_price || 0) > 0 && (
                          <Button 
                            variant="outline"
                            className="rounded-full px-6 py-3 text-sm uppercase tracking-wide font-medium"
                            onClick={() => navigate(`/product/${release.id}`)}
                          >
                            buy
                          </Button>
                        )}
                        <StreamingLinks release={release} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
            {featuredReleases.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-gold' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Releases Section */}
      <section id="releases" className="py-16 px-6 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">🎵 Latest Drops</h2>
            <p className="text-xl text-zinc-300 mb-6">Stream our official releases — fresh from the underground, crafted for the world stage.</p>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <Music className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading releases...</p>
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No releases found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {releases.filter(release => !release.is_featured).map((release) => (
                <div 
                  key={release.id} 
                  className="group cursor-pointer relative"
                  onClick={(e) => {
                    // Don't navigate if clicking on preview player
                    if (!(e.target as HTMLElement).closest('.preview-player')) {
                      navigate(`/release/${release.id}`);
                    }
                  }}
                >
                  <div className="aspect-square overflow-hidden mb-3 bg-zinc-800 rounded relative">
                    {release.cover_art_url ? (
                      <img 
                        src={release.cover_art_url} 
                        alt={`${release.title} cover art`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    
                    <div className="preview-player">
                      <ReleasePreviewPlayer
                        previewUrl={release.preview_url}
                        title={release.title}
                        artist={release.artist}
                        isPlaying={currentlyPlaying === release.id}
                        onPlay={() => handlePreviewPlay(release.id)}
                        onPause={handlePreviewPause}
                      />
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-gold transition-colors">
                    {release.title}
                  </h3>
                  <p className="text-sm text-zinc-400">{release.artist.charAt(0).toUpperCase() + release.artist.slice(1).toLowerCase()}</p>
                  {release.download_url && Number(release.download_price || 0) > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{formatCurrency(Number(release.download_price || 0))}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-3 rounded-full"
                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${release.id}`); }}
                      >
                        Buy
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Artists Section */}
      <section id="artists" className="py-16 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">The 9X Roster</h2>
            <p className="text-xl text-zinc-300">Meet the innovators behind the music. From chart-ready icons to breakout stars — these are the artists shaping the next wave.</p>
          </div>
          {artists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">No artists found</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Videos Section */}
      {videos.filter(video => video.is_featured).length > 0 && (
        <section className="py-16 px-6 bg-zinc-800">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">🎥 The Vision in Motion</h2>
              <p className="text-xl text-zinc-300">Watch official videos, behind-the-scenes content, and exclusive visuals from the world of 9X.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {videos.filter(video => video.is_featured).map((video) => {
                const isYouTubeUrl = video.youtube_url.includes('youtube.com') || video.youtube_url.includes('youtu.be');
                
                const getYouTubeEmbedUrl = (url: string) => {
                  if (url.includes('youtube.com/watch?v=')) {
                    const videoId = url.split('v=')[1]?.split('&')[0];
                    return `https://www.youtube.com/embed/${videoId}`;
                  } else if (url.includes('youtu.be/')) {
                    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                    return `https://www.youtube.com/embed/${videoId}`;
                  }
                  return url;
                };

                return (
                  <div key={video.id} className="space-y-4">
                    <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden">
                      {isYouTubeUrl ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={getYouTubeEmbedUrl(video.youtube_url)}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      ) : (
                        <video
                          src={video.youtube_url}
                          poster={video.thumbnail_url}
                          controls
                          className="w-full h-full object-cover"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-zinc-400">{video.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* All Videos Section */}
      <section id="videos" className="py-16 px-6 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">All Videos</h2>
          {videos.filter(video => !video.is_featured).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.filter(video => !video.is_featured).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
              </div>
              <p className="text-zinc-400">No videos found</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400">All videos are featured above</p>
            </div>
          )}
        </div>
      </section>

      {/* Store Section */}
      <section id="store" className="py-16 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">Store</h2>
            <Button 
              onClick={() => navigate('/store')}
              className="bg-gold text-black hover:bg-gold/90"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          {storeProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {storeProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="group cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="aspect-square overflow-hidden mb-3 bg-zinc-800 rounded">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-gold transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gold">{formatCurrency(product.price)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">No products available</p>
            </div>
          )}
        </div>
      </section>

      {/* Label Vision Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-zinc-800 to-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">🚀 Our Mission</h2>
          <p className="text-xl text-zinc-300 mb-12 leading-relaxed">
            9X is more than a label — we're a movement. Built on collaboration, culture, and creativity, we give power back to artists while launching careers that echo worldwide.
          </p>
          
          <div className="space-y-6 mb-12">
            <h3 className="text-2xl font-semibold text-gold">🧬 Want to Work With Us?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-gold text-black hover:bg-gold/90">
                Submit Your Demo
              </Button>
              <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-black">
                Explore Opportunities
              </Button>
              <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-black">
                Get Involved in the Hub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mailing List */}
      <section className="py-16 px-6 bg-zinc-900">
        <div className="max-w-2xl mx-auto">
          <MailingListForm />
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 px-6 bg-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Contact Us</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-6">Get in Touch</h3>
              <ContactForm />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-6">Connect With Us</h3>
              <div className="space-y-4">
                <p className="text-zinc-300">
                  Ready to take your music to the next level? We're here to help you succeed.
                </p>
                <div className="space-y-2">
                  <p className="text-zinc-400">
                    <strong>Email:</strong> info@9xmusic.com
                  </p>
                  <p className="text-zinc-400">
                    <strong>Phone:</strong> +1 (555) 123-4567
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Label;