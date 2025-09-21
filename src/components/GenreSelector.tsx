import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Comprehensive genre categories
export const GENRE_CATEGORIES = {
  "Hip-Hop & Rap": {
    "Hip-Hop": ["Old School Hip-Hop", "Boom Bap", "Conscious Hip-Hop", "Gangsta Rap", "Trap", "Drill", "Mumble Rap"],
    "Rap": ["East Coast Rap", "West Coast Rap", "Southern Rap", "Midwest Rap", "UK Rap", "French Rap"],
    "Trap": ["Atlanta Trap", "Chicago Drill", "UK Drill", "Latin Trap", "Trap Soul"],
  },
  
  "R&B & Soul": {
    "R&B": ["Contemporary R&B", "Neo-Soul", "Alternative R&B", "Trap Soul", "Future R&B"],
    "Soul": ["Classic Soul", "Neo-Soul", "Funk Soul", "Gospel Soul"],
    "Funk": ["Classic Funk", "P-Funk", "Neo-Funk", "Funk Rock"],
  },

  "Afrobeats & African": {
    "Afrobeats": ["Nigerian Afrobeats", "Ghanaian Afrobeats", "Afro-Pop", "Afro-Fusion"],
    "Afrohouse": ["South African House", "Amapiano", "Afro-Tech"],
    "African Traditional": ["Highlife", "Soukous", "Makossa", "Mbalax", "Kwaito"],
    "Afro-Caribbean": ["Afro-Soca", "Afro-Dancehall"],
  },

  "Caribbean & Latin": {
    "Dancehall": ["Digital Dancehall", "Roots Dancehall", "Dancehall Pop"],
    "Reggae": ["Roots Reggae", "Dub", "Ska", "Rocksteady", "Reggae Fusion"],
    "Soca": ["Power Soca", "Groovy Soca", "Chutney Soca"],
    "Latin": ["Reggaeton", "Latin Pop", "Salsa", "Bachata", "Merengue", "Cumbia"],
    "Brazilian": ["Bossa Nova", "Samba", "MPB", "Forró", "Funk Carioca"],
  },

  "Electronic & Dance": {
    "House": ["Deep House", "Tech House", "Progressive House", "Afro House", "Future House"],
    "Techno": ["Detroit Techno", "Minimal Techno", "Progressive Techno", "Industrial Techno"],
    "Dubstep": ["Brostep", "Future Bass", "Melodic Dubstep", "Riddim"],
    "Drum & Bass": ["Liquid DNB", "Neurofunk", "Jump Up", "Jungle"],
    "Trance": ["Progressive Trance", "Uplifting Trance", "Psytrance", "Tech Trance"],
    "EDM": ["Big Room", "Festival Progressive", "Electro House", "Hardstyle"],
  },

  "Pop & Mainstream": {
    "Pop": ["Dance Pop", "Electropop", "Indie Pop", "K-Pop", "Latin Pop"],
    "Teen Pop": ["Bubblegum Pop", "Disney Pop"],
    "Adult Contemporary": ["Soft Rock", "Contemporary Pop"],
  },

  "Rock & Alternative": {
    "Rock": ["Classic Rock", "Hard Rock", "Progressive Rock", "Psychedelic Rock"],
    "Alternative": ["Indie Rock", "Alternative Rock", "Grunge", "Post-Rock"],
    "Metal": ["Heavy Metal", "Death Metal", "Black Metal", "Power Metal"],
    "Punk": ["Pop Punk", "Hardcore Punk", "Post-Punk"],
  },

  "Jazz & Blues": {
    "Jazz": ["Smooth Jazz", "Contemporary Jazz", "Jazz Fusion", "Bebop", "Cool Jazz"],
    "Blues": ["Chicago Blues", "Delta Blues", "Electric Blues", "Blues Rock"],
  },

  "Country & Folk": {
    "Country": ["Contemporary Country", "Country Pop", "Country Rock", "Bluegrass"],
    "Folk": ["Contemporary Folk", "Indie Folk", "Folk Rock", "Acoustic"],
  },

  "World & Traditional": {
    "Asian": ["J-Pop", "K-Pop", "Bollywood", "Qawwali", "Chinese Pop"],
    "Middle Eastern": ["Arabic Pop", "Persian Music", "Turkish Music"],
    "European": ["French Chanson", "German Schlager", "Italian Pop"],
  },

  "Experimental & Niche": {
    "Ambient": ["Dark Ambient", "Drone", "New Age", "Meditation"],
    "Classical Crossover": ["Neo-Classical", "Modern Classical"],
    "Lo-Fi": ["Lo-Fi Hip-Hop", "Chillhop", "Study Beats"],
  }
};

interface GenreSelectorProps {
  primaryGenre: string;
  subGenre: string;
  onPrimaryGenreChange: (genre: string) => void;
  onSubGenreChange: (subGenre: string) => void;
}

export const GenreSelector: React.FC<GenreSelectorProps> = ({
  primaryGenre,
  subGenre,
  onPrimaryGenreChange,
  onSubGenreChange
}) => {
  const handlePrimaryGenreChange = (genre: string) => {
    onPrimaryGenreChange(genre);
    // Reset sub-genre when primary genre changes
    onSubGenreChange('');
  };

  const getSubGenres = () => {
    if (!primaryGenre) return [];
    
    // Find the category that contains this genre
    for (const [category, genres] of Object.entries(GENRE_CATEGORIES)) {
      if (genres[primaryGenre]) {
        return genres[primaryGenre];
      }
    }
    return [];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="primaryGenre">Primary Genre *</Label>
        <Select value={primaryGenre} onValueChange={handlePrimaryGenreChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary genre" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {Object.entries(GENRE_CATEGORIES).map(([category, genres]) => (
              <div key={category}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                  {category}
                </div>
                {Object.keys(genres).map(genre => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subGenre">Sub-Genre</Label>
        <Select value={subGenre} onValueChange={onSubGenreChange} disabled={!primaryGenre}>
          <SelectTrigger>
            <SelectValue placeholder={primaryGenre ? "Select sub-genre" : "Select primary genre first"} />
          </SelectTrigger>
          <SelectContent>
            {getSubGenres().map(sub => (
              <SelectItem key={sub} value={sub}>
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};