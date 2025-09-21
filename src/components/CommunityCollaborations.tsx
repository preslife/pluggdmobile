import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Calendar, Users, MapPin, Music, DollarSign } from 'lucide-react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const CommunityCollaborations = () => {
  const { projects, loading, applyToProject } = useCollaboration();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || project.genre === selectedGenre;
    
    return matchesSearch && matchesGenre && project.status === 'open';
  });

  const allGenres = Array.from(new Set(projects.map(project => project.genre).filter(Boolean)));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-gradient-card border-border animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-3 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Active Collaborations</h2>
          <p className="text-muted-foreground">Find projects to collaborate on or discover new creative partners</p>
        </div>
        <Link to="/collaborate">
          <Button variant="hero">
            <Users className="w-4 h-4 mr-2" />
            Browse All Projects
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search collaboration projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-md text-sm"
        >
          <option value="all">All Genres</option>
          {allGenres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.slice(0, 9).map((project) => (
          <Card key={project.id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate" title={project.title}>
                    {project.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </div>
                {project.is_featured && (
                  <Badge className="ml-2 bg-gold text-gold-foreground">
                    Featured
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Project Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Music className="w-4 h-4" />
                  <span>{project.genre}</span>
                  <Badge variant="outline" className="text-xs">
                    {project.project_type}
                  </Badge>
                </div>
                
                {project.budget_range && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>{project.budget_range}</span>
                  </div>
                )}
                
                {project.deadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Due {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}</span>
                  </div>
                )}
              </div>

              {/* Skills Needed */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Skills Needed:</h4>
                <div className="flex flex-wrap gap-1">
                  {project.skills_needed.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {project.skills_needed.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.skills_needed.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Link to={`/collaborate?project=${project.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => applyToProject(project.id, '')}
                >
                  Apply
                </Button>
              </div>

              {/* Posted Time */}
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No collaboration projects found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedGenre !== 'all'
              ? "Try adjusting your search or filters."
              : "No active collaboration projects at the moment."}
          </p>
          <Link to="/collaborate" className="inline-block mt-4">
            <Button variant="outline">
              Submit Your Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default CommunityCollaborations;