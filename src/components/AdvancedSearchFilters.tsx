import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/utils';

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  genres: string[];
  totalResults: number;
}

export interface SearchFilters {
  searchTerm: string;
  genre: string;
  priceRange: [number, number];
  bpmRange: [number, number];
  key: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const keys = ['Any', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const sortOptions = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'price', label: 'Price' },
  { value: 'bpm', label: 'BPM' },
];

export const AdvancedSearchFilters = ({ onFiltersChange, genres, totalResults }: SearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    genre: 'all',
    priceRange: [0, 100],
    bpmRange: [0, 200],
    key: 'Any',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    onFiltersChange(filters);
    updateActiveFilters();
  }, [filters, onFiltersChange]);

  const updateActiveFilters = () => {
    const active: string[] = [];
    
    if (filters.searchTerm) active.push(`Search: "${filters.searchTerm}"`);
    if (filters.genre !== 'all') active.push(`Genre: ${filters.genre}`);
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) {
      active.push(`Price: ${formatCurrency(filters.priceRange[0])} - ${formatCurrency(filters.priceRange[1])}`);
    }
    if (filters.bpmRange[0] > 0 || filters.bpmRange[1] < 200) {
      active.push(`BPM: ${filters.bpmRange[0]} - ${filters.bpmRange[1]}`);
    }
    if (filters.key !== 'Any') active.push(`Key: ${filters.key}`);
    
    setActiveFilters(active);
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      genre: 'all',
      priceRange: [0, 100],
      bpmRange: [0, 200],
      key: 'Any',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const removeFilter = (filterText: string) => {
    if (filterText.startsWith('Search:')) {
      setFilters(prev => ({ ...prev, searchTerm: '' }));
    } else if (filterText.startsWith('Genre:')) {
      setFilters(prev => ({ ...prev, genre: 'all' }));
    } else if (filterText.startsWith('Price:')) {
      setFilters(prev => ({ ...prev, priceRange: [0, 100] }));
    } else if (filterText.startsWith('BPM:')) {
      setFilters(prev => ({ ...prev, bpmRange: [0, 200] }));
    } else if (filterText.startsWith('Key:')) {
      setFilters(prev => ({ ...prev, key: 'Any' }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search beats, artists, tags..."
          value={filters.searchTerm}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          className="pl-10 pr-4"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          <Select value={filters.genre} onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value }))}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={`${filters.sortBy}-${filters.sortOrder}`} 
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-') as [string, 'asc' | 'desc'];
              setFilters(prev => ({ ...prev, sortBy, sortOrder }));
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <div key={option.value}>
                  <SelectItem value={`${option.value}-desc`}>{option.label} ↓</SelectItem>
                  <SelectItem value={`${option.value}-asc`}>{option.label} ↑</SelectItem>
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Advanced
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* BPM Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    BPM Range: {filters.bpmRange[0]} - {filters.bpmRange[1]}
                  </label>
                  <Slider
                    value={filters.bpmRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, bpmRange: value as [number, number] }))}
                    min={0}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Key */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Key</label>
                  <Select value={filters.key} onValueChange={(value) => setFilters(prev => ({ ...prev, key: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeFilter(filter)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {totalResults} beat{totalResults !== 1 ? 's' : ''}
      </div>
    </div>
  );
};