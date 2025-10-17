import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, MapPin, Star, Calendar, Music, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { BookingForm } from "@/components/BookingForm";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";

type DirectoryEntry = {
  id: string;
  name: string;
  title: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  rating?: number | null;
  reviewsCount?: number | null;
  genres?: string[] | null;
  location?: string | null;
  experience?: string | null;
  hourlyRate?: string | null;
  credits?: string[] | null;
  socialLinks?: { label: string; url: string }[];
  websiteUrl?: string | null;
  userId?: string | null;
  username?: string | null;
  slug?: string | null;
  source: "approved" | "static";
};

type BookingProfessional = {
  id?: string;
  user_id?: string | null;
  name?: string;
  title?: string;
  profiles?: {
    full_name?: string;
    username?: string;
  };
};

const Directory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [approvedProfiles, setApprovedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<BookingProfessional | null>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);

  const handleBookProfessional = (entry: DirectoryEntry) => {
    const bookingPayload: BookingProfessional = {
      id: entry.id,
      user_id: entry.userId ?? undefined,
      name: entry.name,
      title: entry.title,
      profiles: {
        full_name: entry.name,
        username: entry.username ?? entry.slug ?? entry.userId ?? undefined,
      },
    };
    setSelectedProfessional(bookingPayload);
    setIsBookingFormOpen(true);
  };

  useEffect(() => {
    fetchApprovedProfiles();
  }, []);

  const fetchApprovedProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('approved_directory_profiles')
        .select(`
          *,
          profiles!inner(user_id, username, full_name, avatar_url, user_type, is_verified, slug, bio)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovedProfiles(data || []);
    } catch (error) {
      console.error('Error fetching approved profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const professionals: DirectoryEntry[] = useMemo(() => [
    {
      id: "static-1",
      name: "Marcus Johnson",
      title: "Hip-Hop Producer & Mix Engineer",
      location: "Atlanta, GA",
      rating: 4.9,
      reviewsCount: 127,
      genres: ["Hip-Hop", "Trap", "R&B"],
      experience: "8+ years",
      credits: ["Drake", "Future", "Migos"],
      hourlyRate: "£150-300",
      avatarUrl: "/placeholder.svg",
      verified: true,
      bio: "Grammy-nominated producer specializing in modern hip-hop and trap beats. Over 50M streams across platforms.",
      source: "static"
    },
    {
      id: "static-2",
      name: "Sarah Chen",
      title: "Vocalist & Songwriter",
      location: "Los Angeles, CA",
      rating: 4.8,
      reviewsCount: 89,
      genres: ["Pop", "R&B", "Indie"],
      experience: "6+ years",
      credits: ["Ariana Grande", "The Weeknd", "Dua Lipa"],
      hourlyRate: "£200-400",
      avatarUrl: "/placeholder.svg",
      verified: true,
      bio: "Multi-platinum songwriter and vocalist with extensive experience in pop and R&B collaborations.",
      source: "static"
    },
    {
      id: "static-3",
      name: "Alex Rodriguez",
      title: "Mixing & Mastering Engineer",
      location: "Nashville, TN",
      rating: 4.9,
      reviewsCount: 156,
      genres: ["Country", "Rock", "Pop"],
      experience: "12+ years",
      credits: ["Keith Urban", "Carrie Underwood", "Brad Paisley"],
      hourlyRate: "£100-250",
      avatarUrl: "/placeholder.svg",
      verified: true,
      bio: "Award-winning engineer with state-of-the-art studio. Specializes in bringing out the best in every track.",
      source: "static"
    },
    {
      id: "static-4",
      name: "DJ Phoenix",
      title: "Electronic Music Producer",
      location: "Miami, FL",
      rating: 4.7,
      reviewsCount: 73,
      genres: ["Electronic", "House", "Techno"],
      experience: "5+ years",
      credits: ["Calvin Harris", "Skrillex", "Deadmau5"],
      hourlyRate: "£125-275",
      avatarUrl: "/placeholder.svg",
      verified: false,
      bio: "Rising star in electronic music scene with multiple festival appearances and chart-topping remixes.",
      source: "static"
    }
  ], []);

  const parseSocialLinks = (links: any): { label: string; url: string }[] => {
    if (!links) return [];
    if (Array.isArray(links)) {
      return links
        .filter((item) => item && typeof item === "object" && typeof item.url === "string")
        .map((item) => ({
          label: item.label || item.platform || "Link",
          url: item.url,
        }));
    }
    if (typeof links === "object") {
      return Object.entries(links)
        .filter(([, url]) => typeof url === "string")
        .map(([label, url]) => ({
          label: label.replace(/_/g, " "),
          url: url as string,
        }));
    }
    return [];
  };

  const normalizedApprovedProfiles: DirectoryEntry[] = useMemo(
    () =>
      approvedProfiles.map((profile: any) => ({
        id: profile.id,
        name: profile.profiles?.full_name || profile.profiles?.username || "Creator",
        title: profile.title,
        bio: profile.bio || profile.profiles?.bio,
        avatarUrl: profile.profiles?.avatar_url,
        verified: Boolean(profile.verified || profile.profiles?.is_verified),
        rating: profile.rating,
        reviewsCount: profile.reviews_count,
        genres: profile.genres,
        location: profile.location,
        experience: profile.experience,
        hourlyRate: profile.hourly_rate,
        credits: profile.credits,
        socialLinks: parseSocialLinks(profile.social_links),
        websiteUrl: profile.website_url,
        userId: profile.profiles?.user_id,
        username: profile.profiles?.username,
        slug: profile.profiles?.slug,
        source: "approved" as const,
      })),
    [approvedProfiles]
  );

  const allEntries: DirectoryEntry[] = useMemo(
    () => [...normalizedApprovedProfiles, ...professionals],
    [normalizedApprovedProfiles, professionals]
  );

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach((entry) => {
      entry.genres?.forEach((genre) => {
        if (typeof genre === "string" && genre.trim()) {
          set.add(genre);
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allEntries]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach((entry) => {
      if (entry.location && entry.location.trim()) {
        set.add(entry.location);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      if (searchTerm) {
        const haystack = `${entry.name} ${entry.title} ${entry.bio ?? ""}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      if (selectedGenre) {
        if (!entry.genres || !entry.genres.some((genre) => genre?.toLowerCase() === selectedGenre.toLowerCase())) {
          return false;
        }
      }
      if (selectedLocation) {
        if (!entry.location || entry.location.toLowerCase() !== selectedLocation.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [allEntries, searchTerm, selectedGenre, selectedLocation]);

  return (
    <div className="min-h-screen bg-background">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Industry</span>
            {" "}
            <span className="text-foreground">Directory</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Connect with verified music industry professionals, from producers to engineers to session musicians
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-gradient-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Find Professionals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search creators or professionals..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Genre">
                    {selectedGenre || "Genre"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    All genres
                  </SelectItem>
                  {availableGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location">
                    {selectedLocation || "Location"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    All locations
                  </SelectItem>
                  {availableLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="mixing">Mixing</SelectItem>
                  <SelectItem value="mastering">Mastering</SelectItem>
                  <SelectItem value="vocals">Vocals</SelectItem>
                  <SelectItem value="songwriting">Songwriting</SelectItem>
                  <SelectItem value="instruments">Instruments</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="hero"
                type="button"
                onClick={() => {
                  // no-op: filters are reactive; button kept for affordance
                }}
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading professionals...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-primary/40 rounded-3xl bg-primary/5">
            <Music className="w-10 h-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Try adjusting your filters or explore the featured creators on the homepage to discover new collaborators.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEntries.map((entry) => {
                const initials = entry.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "U";
                const profileUrl = entry.username
                  ? `/creator/${entry.username}`
                  : entry.slug
                  ? `/creator/${entry.slug}`
                  : entry.userId
                  ? `/creator/${entry.userId}`
                  : null;
                const genresToShow = entry.genres?.slice(0, 3) ?? [];
                const additionalGenres = entry.genres && entry.genres.length > 3 ? entry.genres.length - 3 : 0;
                const ratingValue = typeof entry.rating === "number" ? entry.rating : null;
                const ratingDisplay = ratingValue !== null ? ratingValue.toFixed(1) : null;
                const hasReviews =
                  typeof entry.reviewsCount === "number" && entry.reviewsCount > 0;

                return (
                  <Card
                    key={entry.id}
                    className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group"
                  >
                    <CardHeader className="text-center">
                      <div className="relative mx-auto mb-4">
                        <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
                          <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        {entry.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg">{entry.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{entry.title}</p>

                      {(ratingDisplay || hasReviews) && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Star className="w-4 h-4 fill-gold text-gold" />
                          {ratingDisplay && <span className="text-sm font-medium">{ratingDisplay}</span>}
                          {hasReviews && (
                            <span className="text-xs text-muted-foreground">
                              ({entry.reviewsCount} {entry.reviewsCount === 1 ? "review" : "reviews"})
                            </span>
                          )}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {entry.bio && (
                        <p className="text-sm text-muted-foreground text-center line-clamp-4">{entry.bio}</p>
                      )}

                      {entry.location && (
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {entry.location}
                        </div>
                      )}

                      {genresToShow.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {genresToShow.map((genre, index) => (
                            <Badge key={`${entry.id}-genre-${index}`} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {additionalGenres > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{additionalGenres}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        {entry.experience && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Experience:</span>
                            <span>{entry.experience}</span>
                          </div>
                        )}
                        {entry.hourlyRate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rate:</span>
                            <span className="text-primary font-medium">{entry.hourlyRate}</span>
                          </div>
                        )}
                      </div>

                      {entry.credits && entry.credits.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-2">Notable Credits:</p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {entry.credits.slice(0, 3).map((credit, index) => (
                              <Badge key={`${entry.id}-credit-${index}`} variant="outline" className="text-xs">
                                {credit}
                              </Badge>
                            ))}
                            {entry.credits.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.credits.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {entry.socialLinks && entry.socialLinks.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                          {entry.socialLinks.slice(0, 3).map((link, index) => (
                            <Button
                              key={`${entry.id}-social-${index}`}
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={link.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                {link.label}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {entry.userId ? (
                          <FollowButton
                            userId={entry.userId}
                            currentUserId={user ? user.id : null}
                            className="w-full"
                          />
                        ) : null}

                        {profileUrl ? (
                          <Button variant="hero" className="w-full" asChild>
                            <Link to={profileUrl}>View profile</Link>
                          </Button>
                        ) : (
                          <Button
                            variant="hero"
                            className="w-full"
                            onClick={() => handleBookProfessional(entry)}
                          >
                            View details
                          </Button>
                        )}

                        {entry.source === "static" && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleBookProfessional(entry)}
                          >
                            <Calendar className="w-4 h-4 mr-1" />
                            Book session
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

          </>
        )}

        {/* Load More */}
        {filteredEntries.length > 0 && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </Button>
          </div>
        )}

        {/* Call to Action */}
        <Card className="bg-gradient-accent border-accent/30 mt-16">
          <CardContent className="text-center py-12">
            <Music className="w-12 h-12 mx-auto mb-4 text-accent-foreground" />
            <h3 className="text-2xl font-bold mb-4 text-accent-foreground">
              Are you a music professional?
            </h3>
            <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
              Join our directory and connect with artists, producers, and industry professionals looking for your expertise.
            </p>
            <Button variant="secondary" size="lg">
              Join the Directory
            </Button>
          </CardContent>
        </Card>

        {/* Booking Form */}
        {selectedProfessional && (
          <BookingForm
            professional={selectedProfessional}
            isOpen={isBookingFormOpen}
            onClose={() => {
              setIsBookingFormOpen(false);
              setSelectedProfessional(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Directory;
