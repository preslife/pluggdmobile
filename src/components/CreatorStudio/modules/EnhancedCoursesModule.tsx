import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Plus, 
  Users,
  DollarSign,
  Clock,
  Star,
  Edit,
  Trash2,
  Eye,
  Play,
  FileText,
  Video,
  Music,
  CheckCircle,
  TrendingUp,
  Award
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  content: Lesson[];
  thumbnail_url?: string;
  price: number;
  difficulty_level: string;
  duration_hours: number;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'audio' | 'quiz';
  content: string;
  duration?: number;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface CourseProgress {
  course_id: string;
  completion_percentage: number;
  last_accessed_at: string;
  completed_at?: string;
}

interface CourseStats {
  total_students: number;
  total_revenue: number;
  average_rating: number;
  completion_rate: number;
}

/**
 * EnhancedCoursesModule - Full LMS integration for creators
 * Create, manage, and track educational content
 */
export const EnhancedCoursesModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseStats, setCourseStats] = useState<Map<string, CourseStats>>(new Map());
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    price: 0,
    difficulty_level: 'beginner',
    duration_hours: 1,
    tags: '',
    thumbnail_url: '',
    is_published: false
  });
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: 'video' as const,
    content: '',
    duration: 0,
    videoUrl: '',
    audioUrl: ''
  });

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch courses created by this instructor
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });
      
      if (coursesError) throw coursesError;
      
      const processedCourses = (coursesData || []).map(course => ({
        ...course,
        content: Array.isArray(course.content) ? course.content : []
      }));
      
      setCourses(processedCourses);
      
      // Fetch stats for each course
      const stats = new Map<string, CourseStats>();
      for (const course of processedCourses) {
        // Fetch enrollments
        const { data: enrollments } = await supabase
          .from('user_course_progress')
          .select('*')
          .eq('course_id', course.id);
        
        // Fetch reviews
        const { data: reviews } = await supabase
          .from('course_reviews')
          .select('rating')
          .eq('course_id', course.id);
        
        const totalStudents = enrollments?.length || 0;
        const completedStudents = enrollments?.filter(e => e.completed_at).length || 0;
        const avgRating = reviews?.length 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;
        
        stats.set(course.id, {
          total_students: totalStudents,
          total_revenue: totalStudents * course.price,
          average_rating: avgRating,
          completion_rate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0
        });
      }
      
      setCourseStats(stats);
      
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!user) return;
    
    try {
      const courseData = {
        ...courseForm,
        instructor_id: user.id,
        tags: courseForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        content: lessons
      };
      
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);
        
        if (error) throw error;
        
        toast({
          title: "Course updated",
          description: "Your course has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([courseData]);
        
        if (error) throw error;
        
        toast({
          title: "Course created",
          description: "Your course has been created successfully",
        });
      }
      
      setShowCreateCourse(false);
      setEditingCourse(null);
      resetCourseForm();
      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error saving course",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      toast({
        title: "Course deleted",
        description: "The course has been deleted successfully",
      });
      
      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error deleting course",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddLesson = () => {
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: lessonForm.title,
      type: lessonForm.type,
      content: lessonForm.content,
      duration: lessonForm.duration,
      videoUrl: lessonForm.videoUrl,
      audioUrl: lessonForm.audioUrl
    };
    
    setLessons([...lessons, newLesson]);
    setShowLessonForm(false);
    resetLessonForm();
  };

  const handleRemoveLesson = (lessonId: string) => {
    setLessons(lessons.filter(l => l.id !== lessonId));
  };

  const resetCourseForm = () => {
    setCourseForm({
      title: '',
      description: '',
      price: 0,
      difficulty_level: 'beginner',
      duration_hours: 1,
      tags: '',
      thumbnail_url: '',
      is_published: false
    });
    setLessons([]);
  };

  const resetLessonForm = () => {
    setLessonForm({
      title: '',
      type: 'video',
      content: '',
      duration: 0,
      videoUrl: '',
      audioUrl: ''
    });
  };

  const editCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      price: course.price,
      difficulty_level: course.difficulty_level,
      duration_hours: course.duration_hours,
      tags: course.tags.join(', '),
      thumbnail_url: course.thumbnail_url || '',
      is_published: course.is_published
    });
    setLessons(course.content || []);
    setShowCreateCourse(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Courses & Education</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-secondary rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-secondary rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Courses & Education</h1>
          <p className="text-muted-foreground">Create and manage your educational content</p>
        </div>
        <Button onClick={() => setShowCreateCourse(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">
              {courses.filter(c => c.is_published).length} published
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(courseStats.values()).reduce((sum, s) => sum + s.total_students, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Array.from(courseStats.values()).reduce((sum, s) => sum + s.total_revenue, 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Total earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {(() => {
                const ratings = Array.from(courseStats.values()).map(s => s.average_rating).filter(r => r > 0);
                const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
                return avg.toFixed(1);
              })()}
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground">Student rating</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="my-courses" className="space-y-4">
          {courses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">You haven't created any courses yet</p>
                <Button onClick={() => setShowCreateCourse(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Course
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const stats = courseStats.get(course.id);
                return (
                  <Card key={course.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                        </div>
                        <Badge variant={course.is_published ? 'default' : 'secondary'}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {stats?.total_students || 0} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {course.duration_hours}h
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${course.price}
                        </span>
                        {stats && stats.average_rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {stats.average_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {course.difficulty_level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {course.content?.length || 0} lessons
                        </Badge>
                      </div>
                      
                      {stats && stats.total_students > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Completion Rate</span>
                            <span>{stats.completion_rate.toFixed(0)}%</span>
                          </div>
                          <Progress value={stats.completion_rate} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => editCourse(course)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteCourse(course.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Track your courses' success metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  View detailed insights about student engagement and progress
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>Manage your students and track their progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Student management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Reviews</CardTitle>
              <CardDescription>See what students are saying about your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Reviews will appear here once students complete your courses
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-background rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Introduction to Music Production"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will students learn in this course?"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select 
                    value={courseForm.difficulty_level}
                    onValueChange={(value) => setCourseForm(prev => ({ ...prev, difficulty_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={courseForm.duration_hours}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={courseForm.tags}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="music, production, mixing"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  value={courseForm.thumbnail_url}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              
              {/* Lessons Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Course Lessons</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowLessonForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Lesson
                  </Button>
                </div>
                
                {lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No lessons added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{index + 1}.</span>
                          <div>
                            <p className="font-medium text-sm">{lesson.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {lesson.type}
                              </Badge>
                              {lesson.duration && (
                                <span>{lesson.duration} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveLesson(lesson.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={courseForm.is_published}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="published">Publish course immediately</Label>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSaveCourse} className="flex-1">
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateCourse(false);
                    setEditingCourse(null);
                    resetCourseForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Add Lesson</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lessonTitle">Lesson Title</Label>
                <Input
                  id="lessonTitle"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Introduction to DAWs"
                />
              </div>
              
              <div>
                <Label htmlFor="lessonType">Lesson Type</Label>
                <Select 
                  value={lessonForm.type}
                  onValueChange={(value: any) => setLessonForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lessonContent">Content/Description</Label>
                <Textarea
                  id="lessonContent"
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Lesson content or description..."
                  rows={3}
                />
              </div>
              
              {lessonForm.type === 'video' && (
                <div>
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input
                    id="videoUrl"
                    value={lessonForm.videoUrl}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              )}
              
              {lessonForm.type === 'audio' && (
                <div>
                  <Label htmlFor="audioUrl">Audio URL</Label>
                  <Input
                    id="audioUrl"
                    value={lessonForm.audioUrl}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, audioUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddLesson} className="flex-1">
                  Add Lesson
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowLessonForm(false);
                    resetLessonForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCoursesModule;
