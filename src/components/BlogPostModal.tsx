import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

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

interface BlogPostModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const BlogPostModal = ({ post, isOpen, onClose, isAdmin = false }: BlogPostModalProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const [renderMethod, setRenderMethod] = useState<'srcDoc' | 'blob' | 'dataUrl'>('srcDoc');
  
  if (!post) return null;

  // Create blob URL for HTML content
  const createBlobUrl = (htmlContent: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  // Create data URL for HTML content
  const createDataUrl = (htmlContent: string) => {
    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  };

  // Open HTML in new tab
  const openInNewTab = (htmlContent: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <DialogTitle className="text-2xl mb-3">{post.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
                </div>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {post.featured_image_url && (
            <div className="aspect-video overflow-hidden rounded-lg">
              <img 
                src={post.featured_image_url} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="max-w-none">
            {post.html_content ? (
              <div className="space-y-4">
                {/* Admin Controls */}
                {isAdmin && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Render method:</label>
                      <select 
                        value={renderMethod} 
                        onChange={(e) => setRenderMethod(e.target.value as typeof renderMethod)}
                        className="px-2 py-1 text-xs rounded border"
                      >
                        <option value="srcDoc">SrcDoc</option>
                        <option value="blob">Blob URL</option>
                        <option value="dataUrl">Data URL</option>
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewTab(post.html_content!)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in new tab
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDebug(!showDebug)}
                      className="flex items-center gap-1"
                    >
                      <Code className="w-3 h-3" />
                      {showDebug ? 'Hide' : 'Show'} HTML
                    </Button>
                  </div>
                )}

                {/* Debug Panel */}
                {isAdmin && showDebug && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Raw HTML Content:</h4>
                    <pre className="text-xs overflow-auto max-h-64 p-2 bg-background rounded border">
                      {post.html_content}
                    </pre>
                  </div>
                )}

                {/* HTML Renderer */}
                {renderMethod === 'srcDoc' && (
                  <iframe
                    srcDoc={post.html_content}
                    className="w-full min-h-[500px] border-0 rounded-lg"
                    title={post.title}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-modals allow-downloads"
                    style={{ height: 'calc(90vh - 400px)' }}
                  />
                )}
                
                {renderMethod === 'blob' && (
                  <iframe
                    src={createBlobUrl(post.html_content)}
                    className="w-full min-h-[500px] border-0 rounded-lg"
                    title={post.title}
                    style={{ height: 'calc(90vh - 400px)' }}
                  />
                )}
                
                {renderMethod === 'dataUrl' && (
                  <iframe
                    src={createDataUrl(post.html_content)}
                    className="w-full min-h-[500px] border-0 rounded-lg"
                    title={post.title}
                    style={{ height: 'calc(90vh - 400px)' }}
                  />
                )}
              </div>
            ) : (
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {post.content}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};