import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileText, Plus, Edit, Trash2, Eye, Upload, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { FileUpload } from '@/components/FileUpload';
import { formatDistanceToNow } from 'date-fns';

type BlogPost = {
  id: string;
  title: string;
  content?: string;
  html_content?: string;
  excerpt?: string;
  featured_image_url?: string;
  tags: string[];
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type BlogFormData = {
  title: string;
  excerpt: string;
  content: string;
  tags: string;
  featured_image_url: string;
  is_published: boolean;
};

export const AdminBlogManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [activeMode, setActiveMode] = useState<'text' | 'html'>('text');
  const [htmlFile, setHtmlFile] = useState<string>('');

  const form = useForm<BlogFormData>({
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      tags: '',
      featured_image_url: '',
      is_published: false
    }
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch blog posts.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (data: BlogFormData) => {
    if (!user) return;

    try {
      const tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const postData = {
        title: data.title,
        excerpt: data.excerpt,
        tags: tags,
        featured_image_url: data.featured_image_url || null,
        is_published: data.is_published,
        created_by: user.id,
        ...(activeMode === 'text' 
          ? { content: data.content, html_content: null }
          : { content: null, html_content: htmlFile }
        )
      };

      const { error } = await supabase
        .from('blog_posts')
        .insert([postData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Blog post created successfully."
      });

      form.reset();
      setHtmlFile('');
      setShowCreateForm(false);
      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create blog post.",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePost = async (data: BlogFormData) => {
    if (!editingPost) return;

    try {
      const tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const postData = {
        title: data.title,
        excerpt: data.excerpt,
        tags: tags,
        featured_image_url: data.featured_image_url || null,
        is_published: data.is_published,
        ...(activeMode === 'text' 
          ? { content: data.content, html_content: null }
          : { content: null, html_content: htmlFile }
        )
      };

      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', editingPost.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Blog post updated successfully."
      });

      form.reset();
      setHtmlFile('');
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update blog post.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Blog post deleted successfully."
      });

      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete blog post.",
        variant: "destructive"
      });
    }
  };

  const startEdit = (post: BlogPost) => {
    setEditingPost(post);
    setActiveMode(post.html_content ? 'html' : 'text');
    setHtmlFile(post.html_content || '');
    form.reset({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content || '',
      tags: post.tags.join(', '),
      featured_image_url: post.featured_image_url || '',
      is_published: post.is_published
    });
  };

  const handleImageUpload = (url: string) => {
    form.setValue('featured_image_url', url);
  };

  // Function to create a preview with iframe
  const createPreview = (htmlContent: string) => {
    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-96 border rounded-lg"
        title="Blog Post Preview"
        sandbox="allow-same-origin allow-scripts"
      />
    );
  };

  const handleHtmlFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlContent = e.target?.result as string;
        setHtmlFile(htmlContent);
        toast({
          title: "Success!",
          description: "HTML file loaded successfully."
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read HTML file.",
          variant: "destructive"
        });
      };
      reader.readAsText(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Management</h2>
          <p className="text-muted-foreground">Create and manage blog posts for the community</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          variant="hero"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingPost) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</CardTitle>
            <CardDescription>
              {editingPost ? 'Update your blog post' : 'Create a new blog post for the community'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingPost ? handleUpdatePost : handleCreatePost)} className="space-y-6">
                {/* Mode Selection */}
                <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'text' | 'html')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Text Editor</TabsTrigger>
                    <TabsTrigger value="html">HTML Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      rules={{ required: activeMode === 'text' ? 'Content is required' : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Write your blog post content..." 
                              rows={10}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="html" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Upload HTML File</label>
                        <div className="mt-2">
                          <input
                            type="file"
                            accept=".html,.htm"
                            onChange={handleHtmlFileSelect}
                            className="block w-full text-sm text-muted-foreground
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-medium
                              file:bg-primary file:text-primary-foreground
                              hover:file:bg-primary/80
                              cursor-pointer"
                          />
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Paste HTML Content</label>
                        <p className="text-xs text-muted-foreground mb-2">Perfect for CodePen HTML - just copy and paste directly</p>
                        <textarea
                          placeholder="Paste your complete HTML content here..."
                          value={htmlFile || ''}
                          onChange={(e) => setHtmlFile(e.target.value)}
                          className="w-full h-32 px-3 py-2 text-sm border border-input bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />
                      </div>
                    </div>
                    {htmlFile && (
                      <div className="mt-4 space-y-3">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm text-green-600">✓ HTML content loaded</p>
                        </div>
                        {/* Preview */}
                        <div>
                          <label className="text-sm font-medium">Preview</label>
                          <div className="mt-2 border rounded-lg overflow-hidden">
                            {createPreview(htmlFile)}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Basic Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter post title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="music, production, tips" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description for the blog card..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Featured Image */}
                <div>
                  <label className="text-sm font-medium">Featured Image</label>
                  <FileUpload
                    onUpload={handleImageUpload}
                    accept="image/*"
                    bucketName="beat-artwork"
                    maxSizeMB={5}
                    className="mt-2"
                  >
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload featured image or drag and drop
                      </p>
                    </div>
                  </FileUpload>
                  {form.watch('featured_image_url') && (
                    <div className="mt-2">
                      <img 
                        src={form.watch('featured_image_url')} 
                        alt="Featured" 
                        className="h-20 w-20 object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Publish Toggle */}
                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Publish Post
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Make this post visible to all users
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    {editingPost ? 'Update Post' : 'Create Post'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingPost(null);
                      form.reset();
                      setHtmlFile('');
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <Badge variant={post.is_published ? "default" : "secondary"}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="outline">
                      {post.html_content ? 'HTML' : 'Text'}
                    </Badge>
                  </div>
                  {post.excerpt && (
                    <p className="text-muted-foreground mb-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created {formatDistanceToNow(new Date(post.created_at))} ago</span>
                    {post.tags.length > 0 && (
                      <div className="flex gap-1">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(post)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};