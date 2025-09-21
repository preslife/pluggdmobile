import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { BlogGrid } from '@/components/BlogGrid';
import { setMeta } from "@/lib/seo";

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

const Blog = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMeta(
      "Pluggd Blog — Creator Stories & Tips",
      "Stories, tutorials, and industry insights for music creators.",
      "/blog"
    );
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogPosts(data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Pluggd</span>
              {" "}
              <span className="text-foreground">Blog</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover insights, tutorials, and stories from the music production community
            </p>
          </div>

          {/* Blog Content */}
          <BlogGrid posts={blogPosts} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default Blog;