import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, RotateCcw, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MusicFiltersProps {
  filters: {
    genre: string;
    priceRange: [number, number];
    format: string;
  };
  onFiltersChange: (filters: any) => void;
}

const genres = [
  "all", "Hip Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Country", 
  "Alternative", "Reggae", "Soul", "Funk", "Blues", "Gospel", "Classical"
];

const formats = [
  { value: "all", label: "All Formats" },
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "flac", label: "FLAC" },
  { value: "stems", label: "Stems Available" }
];

export const MusicFilters = ({ filters, onFiltersChange }: MusicFiltersProps) => {
  const resetFilters = () => {
    onFiltersChange({
      genre: 'all',
      priceRange: [0, 100],
      format: 'all'
    });
  };

  const hasActiveFilters = filters.genre !== 'all' || 
                          filters.priceRange[0] > 0 || 
                          filters.priceRange[1] < 100 || 
                          filters.format !== 'all';

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="w-5 h-5" />
            Music Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Genre Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Genre</label>
          <Select value={filters.genre} onValueChange={(value) => 
            onFiltersChange({ ...filters, genre: value })
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {genres.map(genre => (
                <SelectItem key={genre} value={genre}>
                  {genre === 'all' ? 'All Genres' : genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Price Range: {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
          </label>
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, priceRange: value as [number, number] })
            }
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Free</span>
            <span>£100+</span>
          </div>
        </div>

        {/* Format Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Format</label>
          <Select value={filters.format} onValueChange={(value) => 
            onFiltersChange({ ...filters, format: value })
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {formats.map(format => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-1">
              {filters.genre !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Genre: {filters.genre}
                </Badge>
              )}
              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100) && (
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
                </Badge>
              )}
              {filters.format !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {formats.find(f => f.value === filters.format)?.label}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};