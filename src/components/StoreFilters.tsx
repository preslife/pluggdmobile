import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Filter, X } from "lucide-react";

interface StoreFiltersProps {
  filters: {
    search: string;
    category: string;
    priceRange: [number, number];
    genres: string[];
    inStock: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const StoreFilters: React.FC<StoreFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle
}) => {
  const genres = ["Hip Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Country", "Alternative"];

  const handleGenreChange = (genre: string, checked: boolean) => {
    const newGenres = checked 
      ? [...filters.genres, genre]
      : filters.genres.filter(g => g !== genre);
    
    onFiltersChange({ ...filters, genres: newGenres });
  };

  return (
    <div className={`${isOpen ? 'block' : 'hidden'} lg:block`}>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle} className="lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Products</Label>
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Search by name, artist, or description..."
              className="mt-2"
            />
          </div>

          {/* Price Range */}
          <div>
            <Label>Price Range: {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}</Label>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => onFiltersChange({ ...filters, priceRange: value as [number, number] })}
              max={500}
              min={0}
              step={5}
              className="mt-2"
            />
          </div>

          {/* Genres */}
          <div>
            <Label className="text-base font-medium">Genres</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {genres.map((genre) => (
                <div key={genre} className="flex items-center space-x-2">
                  <Checkbox
                    id={genre}
                    checked={filters.genres.includes(genre)}
                    onCheckedChange={(checked) => handleGenreChange(genre, !!checked)}
                  />
                  <Label htmlFor={genre} className="text-sm font-normal cursor-pointer">
                    {genre}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inStock"
              checked={filters.inStock}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, inStock: !!checked })}
            />
            <Label htmlFor="inStock" className="text-sm font-normal cursor-pointer">
              In Stock Only
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Filter Toggle Button */}
      <Button 
        onClick={onToggle}
        className="lg:hidden w-full mb-4"
        variant="outline"
      >
        <Filter className="w-4 h-4 mr-2" />
        {isOpen ? 'Hide Filters' : 'Show Filters'}
      </Button>
    </div>
  );
};