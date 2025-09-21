import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReportButton from './ReportButton';

type BlogPost = {
  id: string;
  title: string;
  excerpt?: string;
  featured_image_url?: string;
  tags: string[];
  created_at: string;
  created_by: string;
};

interface BlogCardProps {
  post: BlogPost;
  onClick: () => void;
}

export const BlogCard = ({ post, onClick }: BlogCardProps) => {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-card border-border overflow-hidden"
      onClick={onClick}
    >
      {post.featured_image_url && (
        <div className="aspect-video overflow-hidden">
          <img 
            src={post.featured_image_url} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {post.title}
          </CardTitle>
          <ReportButton 
            targetType="blog_post" 
            targetId={post.id} 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        {post.excerpt && (
          <CardDescription className="line-clamp-3">
            {post.excerpt}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
          </div>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{post.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};