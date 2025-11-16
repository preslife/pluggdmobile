import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FilterX } from 'lucide-react';
import type { LmsCourseDifficulty } from '../api/types';
import { cn } from '@/lib/utils';

export interface CourseFilterState {
  query: string;
  difficulty: 'all' | LmsCourseDifficulty;
  visibility: 'all' | 'public' | 'unlisted' | 'private';
  topic: string | null;
}

interface CourseFiltersProps {
  filters: CourseFilterState;
  topics: string[];
  onChange: (next: CourseFilterState) => void;
}

export const CourseFilters = ({ filters, topics, onChange }: CourseFiltersProps) => {
  const updateFilter = (key: keyof CourseFilterState, value: CourseFilterState[typeof key]) => {
    onChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onChange({
      query: '',
      difficulty: 'all',
      visibility: 'all',
      topic: null,
    });
  };

  return (
    <div className="rounded-3xl border bg-card/70 p-4 shadow-sm md:p-6">
      <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr]">
        <div className="space-y-2">
          <Label htmlFor="course-search" className="text-xs uppercase tracking-wide text-muted-foreground">
            Search catalog
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="course-search"
              placeholder="Search by title, instructor, or topic"
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Difficulty</Label>
          <Select value={filters.difficulty} onValueChange={(value) => updateFilter('difficulty', value as CourseFilterState['difficulty'])}>
            <SelectTrigger>
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visibility</Label>
          <Select value={filters.visibility} onValueChange={(value) => updateFilter('visibility', value as CourseFilterState['visibility'])}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="unlisted">Unlisted</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Topics</Label>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 12).map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className={cn(
                  'cursor-pointer rounded-full border px-4 py-1 text-xs capitalize transition-colors',
                  filters.topic === topic ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground'
                )}
                onClick={() => updateFilter('topic', filters.topic === topic ? null : topic)}
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2 text-muted-foreground">
          <FilterX className="h-4 w-4" />
          Reset filters
        </Button>
      </div>
    </div>
  );
};
