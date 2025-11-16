import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAcademyBasePath, getAcademyCoursePath } from '@/lib/academyRoutes';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  difficulty_level: string;
  duration_hours: number;
  price: number;
  tags: string[];
  instructor_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

const FeaturedCourse = () => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCourse();
  }, []);

  const fetchFeaturedCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, difficulty_level, duration_hours, price, tags, instructor_id')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching featured course:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="h-8 bg-muted animate-pulse rounded w-64 mx-auto mb-4"></div>
            <div className="h-6 bg-muted animate-pulse rounded w-96 mx-auto mb-8"></div>
            <div className="bg-card animate-pulse rounded-lg h-96"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Course</h2>
            <p className="text-muted-foreground text-lg mb-8">Level up your music production skills</p>
            <Card className="max-w-md mx-auto p-8">
              <CardContent className="text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Courses Available</h3>
                <p className="text-muted-foreground mb-4">Check back soon for new learning opportunities!</p>
                <Link to={getAcademyBasePath()}>
                  <Button>Browse Education</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Course</h2>
          <p className="text-muted-foreground text-lg">Level up your music production skills</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden hover:shadow-glow transition-all duration-300">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="aspect-video md:aspect-square relative">
                <img
                  src={course.thumbnail_url || '/placeholder.svg'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary/90 text-primary-foreground">Featured</Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                    {course.difficulty_level}
                  </Badge>
                </div>
              </div>
              
              <div className="p-6 md:p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <p className="text-muted-foreground line-clamp-3">{course.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {course.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_hours}h duration</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>All levels</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Star className="w-4 h-4" />
                      <span>4.8 rating</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>Interactive</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <img
                      src="/placeholder.svg"
                      alt="Instructor"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm">Expert Instructor</p>
                      <p className="text-xs text-muted-foreground">Instructor</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {course.price > 0 ? `£${course.price}` : 'Free'}
                    </span>
                    {course.price > 0 && (
                      <span className="text-sm text-muted-foreground line-through">£{course.price + 20}</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Link to={getAcademyCoursePath(course.id)} className="flex-1">
                      <Button className="w-full">Start Learning</Button>
                    </Link>
                    <Link to={getAcademyBasePath()}>
                      <Button variant="outline">View All Courses</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCourse;
