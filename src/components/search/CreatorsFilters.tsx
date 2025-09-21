import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, RotateCcw, Shield, Star } from "lucide-react";

interface CreatorsFiltersProps {
  filters: {
    genre: string;
    type: string;
    verified: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

const genres = [
  "all", "Hip Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Country", 
  "Alternative", "Reggae", "Soul", "Funk", "Blues", "Gospel", "Classical"
];

const creatorTypes = [
  { value: "all", label: "All Types" },
  { value: "artist", label: "Artists" },
  { value: "producer", label: "Producers" },
  { value: "songwriter", label: "Songwriters" },
  { value: "vocalist", label: "Vocalists" },
  { value: "musician", label: "Musicians" },
  { value: "engineer", label: "Engineers" },
  { value: "label", label: "Labels" }
];

export const CreatorsFilters = ({ filters, onFiltersChange }: CreatorsFiltersProps) => {
  const resetFilters = () => {
    onFiltersChange({
      genre: 'all',
      type: 'all',
      verified: false
    });
  };

  const hasActiveFilters = filters.genre !== 'all' || 
                          filters.type !== 'all' || 
                          filters.verified;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Creator Filters
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
          <label className="text-sm font-medium mb-2 block">Primary Genre</label>
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

        {/* Creator Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Creator Type</label>
          <Select value={filters.type} onValueChange={(value) => 
            onFiltersChange({ ...filters, type: value })
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {creatorTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Verified Status */}
        <div className="space-y-3">
          <label className="text-sm font-medium block">Status</label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={filters.verified}
              onCheckedChange={(checked) => 
                onFiltersChange({ ...filters, verified: !!checked })
              }
            />
            <label 
              htmlFor="verified" 
              className="text-sm cursor-pointer flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-primary" />
              Verified creators only
            </label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Show only creators verified by our team
          </p>
        </div>

        {/* Quick Filters */}
        <div className="pt-2 border-t">
          <label className="text-sm font-medium mb-3 block">Quick Filters</label>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onFiltersChange({ ...filters, type: 'producer', verified: true })}
            >
              <Star className="w-4 h-4 mr-2" />
              Top Producers
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onFiltersChange({ ...filters, type: 'artist', genre: 'Hip Hop' })}
            >
              <Users className="w-4 h-4 mr-2" />
              Hip Hop Artists
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onFiltersChange({ ...filters, verified: true })}
            >
              <Shield className="w-4 h-4 mr-2" />
              All Verified
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-1">
              {filters.genre !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {filters.genre}
                </Badge>
              )}
              {filters.type !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {creatorTypes.find(t => t.value === filters.type)?.label}
                </Badge>
              )}
              {filters.verified && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};