import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disc, RotateCcw, DollarSign, Music, Key } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BeatsFiltersProps {
  filters: {
    genre: string;
    bpmRange: [number, number];
    key: string;
    priceRange: [number, number];
    licenseType: string;
  };
  onFiltersChange: (filters: any) => void;
}

const genres = [
  "all", "Hip Hop", "Trap", "R&B", "Pop", "Electronic", "Drill", "Boom Bap", 
  "Melodic", "Dark", "Ambient", "Lo-Fi", "Jazz", "Soul", "Afrobeat", "Reggaeton"
];

const keys = [
  "all", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"
];

const licenseTypes = [
  { value: "all", label: "All Licenses" },
  { value: "basic", label: "Basic License" },
  { value: "premium", label: "Premium License" },
  { value: "exclusive", label: "Exclusive License" },
  { value: "free", label: "Free Download" }
];

export const BeatsFilters = ({ filters, onFiltersChange }: BeatsFiltersProps) => {
  const resetFilters = () => {
    onFiltersChange({
      genre: 'all',
      bpmRange: [60, 180],
      key: 'all',
      priceRange: [0, 100],
      licenseType: 'all'
    });
  };

  const hasActiveFilters = filters.genre !== 'all' || 
                          filters.bpmRange[0] > 60 || 
                          filters.bpmRange[1] < 180 ||
                          filters.key !== 'all' ||
                          filters.priceRange[0] > 0 || 
                          filters.priceRange[1] < 100 || 
                          filters.licenseType !== 'all';

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Disc className="w-5 h-5" />
            Beat Filters
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

        {/* BPM Range Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Music className="w-4 h-4" />
            BPM Range: {filters.bpmRange[0]} - {filters.bpmRange[1]}
          </label>
          <Slider
            value={filters.bpmRange}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, bpmRange: value as [number, number] })
            }
            min={60}
            max={180}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>60 BPM</span>
            <span>180 BPM</span>
          </div>
        </div>

        {/* Key Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Key className="w-4 h-4" />
            Key
          </label>
          <Select value={filters.key} onValueChange={(value) => 
            onFiltersChange({ ...filters, key: value })
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select key" />
            </SelectTrigger>
            <SelectContent>
              {keys.map(key => (
                <SelectItem key={key} value={key}>
                  {key === 'all' ? 'All Keys' : key}
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

        {/* License Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">License Type</label>
          <Select value={filters.licenseType} onValueChange={(value) => 
            onFiltersChange({ ...filters, licenseType: value })
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select license" />
            </SelectTrigger>
            <SelectContent>
              {licenseTypes.map(license => (
                <SelectItem key={license.value} value={license.value}>
                  {license.label}
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
                  {filters.genre}
                </Badge>
              )}
              {(filters.bpmRange[0] > 60 || filters.bpmRange[1] < 180) && (
                <Badge variant="secondary" className="text-xs">
                  {filters.bpmRange[0]}-{filters.bpmRange[1]} BPM
                </Badge>
              )}
              {filters.key !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Key: {filters.key}
                </Badge>
              )}
              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100) && (
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
                </Badge>
              )}
              {filters.licenseType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {licenseTypes.find(l => l.value === filters.licenseType)?.label}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};