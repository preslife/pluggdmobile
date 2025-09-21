import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, RotateCcw } from 'lucide-react';

export interface MarketplaceFilters {
  searchTerm: string;
  timeFilter: string;
  genres: string[];
  trackTypes: string[];
  priceFilter: string;
  moods: string[];
  bpmRange: [number, number];
  bpmRangeType: string;
  instruments: string[];
  keys: string[];
  duration: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface MarketplaceFiltersProps {
  onFiltersChange: (filters: MarketplaceFilters) => void;
  availableGenres: string[];
  totalResults: number;
}


export const MarketplaceFilters = ({ onFiltersChange, availableGenres, totalResults }: MarketplaceFiltersProps) => {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    searchTerm: '',
    timeFilter: 'all',
    genres: [],
    trackTypes: [],
    priceFilter: 'all',
    moods: [],
    bpmRange: [0, 200],
    bpmRangeType: 'all',
    instruments: [],
    keys: [],
    duration: 'any',
    sortBy: 'recent',
    sortOrder: 'desc'
  });

  // Custom BPM range state
  const [customBpmMin, setCustomBpmMin] = useState<string>('60');
  const [customBpmMax, setCustomBpmMax] = useState<string>('200');

  // Single selection states for dropdowns
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('all');

  // Define options
  const timeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  const priceOptions = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium' },
    { value: 'under25', label: 'Under $25' },
    { value: 'under50', label: 'Under $50' },
    { value: 'over50', label: 'Over $50' }
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'title', label: 'Title A-Z' }
  ];

  const genreOptions = [
    { value: 'all', label: 'All Genres' },
    ...availableGenres.map(genre => ({ value: genre, label: genre }))
  ];

  const moodOptions = [
    { value: 'all', label: 'All Moods' },
    { value: 'Happy', label: 'Happy' },
    { value: 'Sad', label: 'Sad' },
    { value: 'Energetic', label: 'Energetic' },
    { value: 'Chill', label: 'Chill' },
    { value: 'Dark', label: 'Dark' },
    { value: 'Uplifting', label: 'Uplifting' },
    { value: 'Aggressive', label: 'Aggressive' },
    { value: 'Romantic', label: 'Romantic' }
  ];

  const instrumentOptions = [
    { value: 'all', label: 'All Instruments' },
    { value: 'Piano', label: 'Piano' },
    { value: 'Guitar', label: 'Guitar' },
    { value: 'Drums', label: 'Drums' },
    { value: 'Bass', label: 'Bass' },
    { value: 'Synth', label: 'Synth' },
    { value: 'Violin', label: 'Violin' },
    { value: 'Saxophone', label: 'Saxophone' },
    { value: 'Trumpet', label: 'Trumpet' }
  ];

  const bpmOptions = [
    { value: 'all', label: 'All BPM', range: [0, 200] },
    { value: '60-80', label: '60-80 BPM', range: [60, 80] },
    { value: '80-100', label: '80-100 BPM', range: [80, 100] },
    { value: '100-120', label: '100-120 BPM', range: [100, 120] },
    { value: '120-140', label: '120-140 BPM', range: [120, 140] },
    { value: '140-160', label: '140-160 BPM', range: [140, 160] },
    { value: '160+', label: '160+ BPM', range: [160, 200] },
    { value: 'custom', label: 'Custom Range', range: [0, 200] }
  ];

  // Handle BPM range changes
  useEffect(() => {
    if (filters.bpmRangeType === 'custom') {
      const minBpm = Math.max(0, parseInt(customBpmMin) || 0);
      const maxBpm = Math.min(200, parseInt(customBpmMax) || 200);
      if (minBpm <= maxBpm) {
        setFilters(prev => ({ ...prev, bpmRange: [minBpm, maxBpm] }));
      }
    }
  }, [customBpmMin, customBpmMax, filters.bpmRangeType]);

  // Update filters whenever any filter changes
  useEffect(() => {
    const updatedFilters = {
      ...filters,
      genres: selectedGenre === 'all' ? [] : [selectedGenre],
      moods: selectedMood === 'all' ? [] : [selectedMood],
      instruments: selectedInstrument === 'all' ? [] : [selectedInstrument]
    };
    onFiltersChange(updatedFilters);
  }, [filters, selectedGenre, selectedMood, selectedInstrument, onFiltersChange]);

  // Handle dropdown changes
  const handleDropdownChange = (
    filterKey: keyof MarketplaceFilters,
    value: string
  ) => {
    if (filterKey === 'genres') {
      setSelectedGenre(value);
    } else if (filterKey === 'moods') {
      setSelectedMood(value);
    } else if (filterKey === 'instruments') {
      setSelectedInstrument(value);
    } else {
      setFilters(prev => ({
        ...prev,
        [filterKey]: value
      }));
    }
  };

  // Handle BPM range change
  const handleBpmRangeChange = (value: string) => {
    const selectedOption = bpmOptions.find(option => option.value === value);
    if (selectedOption) {
      setFilters(prev => ({
        ...prev,
        bpmRangeType: value,
        bpmRange: selectedOption.range as [number, number]
      }));
      
      if (value === 'custom') {
        setCustomBpmMin('60');
        setCustomBpmMax('200');
      }
    }
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      timeFilter: 'all',
      genres: [],
      trackTypes: [],
      priceFilter: 'all',
      moods: [],
      bpmRange: [0, 200],
      bpmRangeType: 'all',
      instruments: [],
      keys: [],
      duration: 'any',
      sortBy: 'recent',
      sortOrder: 'desc'
    });
    setSelectedGenre('all');
    setSelectedMood('all');
    setSelectedInstrument('all');
    setCustomBpmMin('60');
    setCustomBpmMax('200');
  };

  return (
    <div className="mb-8">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search beats by title, artist, or keywords..."
          value={filters.searchTerm}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          className="pl-10 h-10 bg-background border-border"
        />
      </div>

      {/* Compact Filter Bar - All Dropdowns */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg">
        {/* Time Filter */}
        <Select
          value={filters.timeFilter}
          onValueChange={(value) => handleDropdownChange('timeFilter', value)}
        >
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Genre Filter */}
        <Select
          value={selectedGenre}
          onValueChange={(value) => handleDropdownChange('genres', value)}
        >
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {genreOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mood Filter */}
        <Select
          value={selectedMood}
          onValueChange={(value) => handleDropdownChange('moods', value)}
        >
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {moodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Instrument Filter */}
        <Select
          value={selectedInstrument}
          onValueChange={(value) => handleDropdownChange('instruments', value)}
        >
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {instrumentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Price Filter */}
        <Select
          value={filters.priceFilter}
          onValueChange={(value) => handleDropdownChange('priceFilter', value)}
        >
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* BPM Range Filter */}
        <div className="flex flex-col gap-2">
          <Select
            value={filters.bpmRangeType}
            onValueChange={handleBpmRangeChange}
          >
            <SelectTrigger className="w-[140px] h-8 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bpmOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Custom BPM Range Inputs */}
          {filters.bpmRangeType === 'custom' && (
            <div className="flex items-center gap-2 px-2 py-1 bg-background border rounded-md">
              <Input
                type="number"
                placeholder="Min"
                value={customBpmMin}
                onChange={(e) => setCustomBpmMin(e.target.value)}
                className="w-16 h-6 text-xs"
                min="0"
                max="200"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={customBpmMax}
                onChange={(e) => setCustomBpmMax(e.target.value)}
                className="w-16 h-6 text-xs"
                min="0"
                max="200"
              />
            </div>
          )}
        </div>

        {/* Sort Options */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) => handleDropdownChange('sortBy', value)}
        >
          <SelectTrigger className="w-[140px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="h-8 px-3"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Clear
        </Button>

        {/* Results Count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {totalResults} beats found
        </div>
      </div>
    </div>
  );
};