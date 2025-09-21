import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, MapPin, Star, MessageCircle, Calendar, Music, Headphones } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BookingForm } from "@/components/BookingForm";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";

const Directory = () => {
  const { user } = useAuth();
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [approvedProfiles, setApprovedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);

  const handleBookProfessional = (professional: any) => {
    setSelectedProfessional(professional);
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
          profiles!inner(username, full_name, avatar_url, user_type)
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

  const professionals = [
    {
      id: 1,
      name: "Marcus Johnson",
      title: "Hip-Hop Producer & Mix Engineer",
      location: "Atlanta, GA",
      rating: 4.9,
      reviews: 127,
      genres: ["Hip-Hop", "Trap", "R&B"],
      experience: "8+ years",
      credits: ["Drake", "Future", "Migos"],
      hourlyRate: "£150-300",
      avatar: "/placeholder.svg",
      verified: true,
      bio: "Grammy-nominated producer specializing in modern hip-hop and trap beats. Over 50M streams across platforms."
    },
    {
      id: 2,
      name: "Sarah Chen",
      title: "Vocalist & Songwriter",
      location: "Los Angeles, CA",
      rating: 4.8,
      reviews: 89,
      genres: ["Pop", "R&B", "Indie"],
      experience: "6+ years",
      credits: ["Ariana Grande", "The Weeknd", "Dua Lipa"],
      hourlyRate: "£200-400",
      avatar: "/placeholder.svg",
      verified: true,
      bio: "Multi-platinum songwriter and vocalist with extensive experience in pop and R&B collaborations."
    },
    {
      id: 3,
      name: "Alex Rodriguez",
      title: "Mixing & Mastering Engineer",
      location: "Nashville, TN",
      rating: 4.9,
      reviews: 156,
      genres: ["Country", "Rock", "Pop"],
      experience: "12+ years",
      credits: ["Keith Urban", "Carrie Underwood", "Brad Paisley"],
      hourlyRate: "£100-250",
      avatar: "/placeholder.svg",
      verified: true,
      bio: "Award-winning engineer with state-of-the-art studio. Specializes in bringing out the best in every track."
    },
    {
      id: 4,
      name: "DJ Phoenix",
      title: "Electronic Music Producer",
      location: "Miami, FL",
      rating: 4.7,
      reviews: 73,
      genres: ["Electronic", "House", "Techno"],
      experience: "5+ years",
      credits: ["Calvin Harris", "Skrillex", "Deadmau5"],
      hourlyRate: "£125-275",
      avatar: "/placeholder.svg",
      verified: false,
      bio: "Rising star in electronic music scene with multiple festival appearances and chart-topping remixes."
    }
  ];

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
                <Input placeholder="Search professionals..." className="pl-10" />
              </div>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rnb">R&B</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atlanta">Atlanta, GA</SelectItem>
                  <SelectItem value="los-angeles">Los Angeles, CA</SelectItem>
                  <SelectItem value="nashville">Nashville, TN</SelectItem>
                  <SelectItem value="new-york">New York, NY</SelectItem>
                  <SelectItem value="miami">Miami, FL</SelectItem>
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
              <Button variant="hero">Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading professionals...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Static professionals from before */}
            {professionals.map((professional) => (
            <Card key={professional.id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
                    <AvatarImage src={professional.avatar} alt={professional.name} />
                    <AvatarFallback>{professional.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {professional.verified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{professional.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{professional.title}</p>
                
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="text-sm font-medium">{professional.rating}</span>
                  <span className="text-xs text-muted-foreground">({professional.reviews})</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">{professional.bio}</p>
                
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {professional.location}
                </div>

                <div className="flex flex-wrap gap-1 justify-center">
                  {professional.genres.map((genre, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span>{professional.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="text-primary font-medium">{professional.hourlyRate}/hr</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Notable Credits:</p>
                  <div className="flex flex-wrap gap-1">
                    {professional.credits.slice(0, 3).map((credit, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {credit}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <FollowButton 
                    userId={`static-${professional.id}`} 
                    currentUserId={user?.id || null} 
                    className="w-full" 
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button 
                      size="sm" 
                      variant="hero" 
                      className="flex-1"
                      onClick={() => handleBookProfessional(professional)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Book
                    </Button>
                  </div>
                </div>
              </CardContent>
              </Card>
            ))}
            
            {/* Approved profiles from database */}
            {approvedProfiles.map((profile) => (
              <Card key={profile.id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group">
                <CardHeader className="text-center">
                  <div className="relative mx-auto mb-4">
                    <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
                      <AvatarImage src={profile.profiles?.avatar_url} alt={profile.profiles?.full_name} />
                      <AvatarFallback>
                        {profile.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {profile.verified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{profile.profiles?.full_name || profile.profiles?.username}</CardTitle>
                  <p className="text-sm text-muted-foreground">{profile.title}</p>
                  
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="text-sm font-medium">{profile.rating || 0}</span>
                    <span className="text-xs text-muted-foreground">({profile.reviews_count || 0})</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">{profile.bio}</p>
                  
                  {profile.location && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}

                  {profile.genres && profile.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {profile.genres.slice(0, 3).map((genre: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {profile.genres.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{profile.genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {profile.experience && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Experience:</span>
                        <span>{profile.experience}</span>
                      </div>
                    )}
                    {profile.hourly_rate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="text-primary font-medium">{profile.hourly_rate}</span>
                      </div>
                    )}
                  </div>

                  {profile.credits && profile.credits.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Notable Credits:</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.credits.slice(0, 3).map((credit: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {credit}
                          </Badge>
                        ))}
                        {profile.credits.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.credits.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <FollowButton 
                      userId={profile.user_id} 
                      currentUserId={user?.id || null} 
                      className="w-full" 
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                      <Button 
                        size="sm" 
                        variant="hero" 
                        className="flex-1"
                        onClick={() => handleBookProfessional(profile)}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Book
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Professionals
          </Button>
        </div>

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