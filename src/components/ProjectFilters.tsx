import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface ProjectFiltersProps {
  searchQuery: string;
  selectedGenre: string;
  selectedSkill: string;
  onSearchChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onSkillChange: (value: string) => void;
  onApplyFilters: () => void;
}

export const ProjectFilters = ({
  searchQuery,
  selectedGenre,
  selectedSkill,
  onSearchChange,
  onGenreChange,
  onSkillChange,
  onApplyFilters
}: ProjectFiltersProps) => {
  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filter Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Select value={selectedGenre} onValueChange={onGenreChange}>
            <SelectTrigger>
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              <SelectItem value="hip-hop">Hip-Hop</SelectItem>
              <SelectItem value="r&b">R&B</SelectItem>
              <SelectItem value="pop">Pop</SelectItem>
              <SelectItem value="rock">Rock</SelectItem>
              <SelectItem value="electronic">Electronic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSkill} onValueChange={onSkillChange}>
            <SelectTrigger>
              <SelectValue placeholder="Skill Needed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="vocals">Vocals</SelectItem>
              <SelectItem value="rap">Rap</SelectItem>
              <SelectItem value="guitar">Guitar</SelectItem>
              <SelectItem value="piano">Piano</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="songwriting">Songwriting</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="hero" onClick={onApplyFilters}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
};