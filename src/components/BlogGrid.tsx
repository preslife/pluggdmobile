import { useState } from 'react';
import { BlogCard } from './BlogCard';
import { BlogPostModal } from './BlogPostModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';

type BlogPost = {
  id: string;
  title: string;
  content?: string;
  html_content?: string;
  excerpt?: string;
  featured_image_url?: string;
  tags: string[];
  created_at: string;
  created_by: string;
};

interface BlogGridProps {
  posts: BlogPost[];
  loading?: boolean;
  isAdmin?: boolean;
}

export const BlogGrid = ({ posts, loading, isAdmin = false }: BlogGridProps) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Get all unique tags
  const allTags = [...new Set(posts.flatMap(post => post.tags))];

  // Filter posts based on search and tag
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === '' || post.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted"></div>
              <div className="p-6 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blog posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedTag === '' ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag('')}
              >
                All
              </Badge>
              {allTags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Blog Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchTerm || selectedTag ? 'No blog posts found matching your criteria.' : 'No blog posts available yet.'}
          </div>
          {(searchTerm || selectedTag) && (
            <div className="space-x-2">
              <button 
                onClick={() => setSearchTerm('')}
                className="text-primary hover:underline"
              >
                Clear search
              </button>
              {selectedTag && (
                <button 
                  onClick={() => setSelectedTag('')}
                  className="text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <BlogPostModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        isAdmin={isAdmin}
      />
    </div>
  );
};