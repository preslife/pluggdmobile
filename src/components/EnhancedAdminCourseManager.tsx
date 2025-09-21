import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploader } from "./MediaUploader";
import { CourseZipUploader } from "./CourseZipUploader";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  Users,
  BookOpen,
  Clock,
  DollarSign,
  Star,
  Image as ImageIcon,
  Music,
  FileText,
  Video,
  HelpCircle,
  Mic
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  content: any[];
  thumbnail_url: string | null;
  price: number;
  difficulty_level: string;
  duration_hours: number;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'markdown' | 'html' | 'audio';
  content: string;
  duration?: number;
  audioUrl?: string;
  imageUrl?: string;
}

export function EnhancedAdminCourseManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses((data || []) as Course[]);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
    }
  };

  const saveCourse = async (courseData: Partial<Course>) => {
    setLoading(true);
    try {
      if (editingCourse?.id) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: "Course updated successfully!" });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            ...courseData,
            instructor_id: 'admin',
            content: [] as any,
            title: courseData.title || 'Untitled Course',
          }]);

        if (error) throw error;
        toast({ title: "Course created successfully!" });
      }

      await fetchCourses();
      setShowCourseModal(false);
      setEditingCourse(null);
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Error",
        description: "Failed to save course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({ title: "Course deleted successfully!" });
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  const addLessonToCourse = async (courseId: string, lesson: Lesson) => {
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;

      const updatedContent = [...course.content, lesson];

      const { error } = await supabase
        .from('courses')
        .update({ content: updatedContent })
        .eq('id', courseId);

      if (error) throw error;

      toast({ title: "Lesson added successfully!" });
      await fetchCourses();
      setShowLessonModal(false);
      setEditingLesson(null);
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast({
        title: "Error",
        description: "Failed to add lesson",
        variant: "destructive",
      });
    }
  };

  const updateLesson = async (courseId: string, lessonIndex: number, lesson: Lesson) => {
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;

      const updatedContent = [...course.content];
      updatedContent[lessonIndex] = lesson;

      const { error } = await supabase
        .from('courses')
        .update({ content: updatedContent })
        .eq('id', courseId);

      if (error) throw error;

      toast({ title: "Lesson updated successfully!" });
      await fetchCourses();
      setShowLessonModal(false);
      setEditingLesson(null);
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson",
        variant: "destructive",
      });
    }
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'text':
      case 'markdown': 
      case 'html': return <FileText className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const CourseForm = ({ course }: { course?: Course | null }) => {
    const [formData, setFormData] = useState({
      title: course?.title || '',
      description: course?.description || '',
      price: course?.price || 0,
      difficulty_level: course?.difficulty_level || 'beginner',
      duration_hours: course?.duration_hours || 1,
      tags: course?.tags?.join(', ') || '',
      thumbnail_url: course?.thumbnail_url || '',
      is_published: course?.is_published || false,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      saveCourse({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter course title"
              required
            />
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select 
              value={formData.difficulty_level} 
              onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
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
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Course description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="price">Price (GBP)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.duration_hours}
              onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label htmlFor="published">Published</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="production, mixing, mastering"
          />
        </div>

        <div>
          <Label htmlFor="thumbnail">Thumbnail URL</Label>
          <Input
            id="thumbnail"
            value={formData.thumbnail_url}
            onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowCourseModal(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </form>
    );
  };

  const LessonForm = ({ lesson, courseId }: { lesson?: Lesson | null; courseId?: string }) => {
    const [formData, setFormData] = useState({
      id: lesson?.id || `lesson-${Date.now()}`,
      title: lesson?.title || '',
      type: lesson?.type || 'text' as const,
      content: lesson?.content || '',
      duration: lesson?.duration || 10,
      audioUrl: lesson?.audioUrl || '',
      imageUrl: lesson?.imageUrl || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!courseId) return;

      if (lesson) {
        const course = courses.find(c => c.id === courseId);
        const lessonIndex = course?.content.findIndex(l => l.id === lesson.id) ?? -1;
        if (lessonIndex >= 0) {
          updateLesson(courseId, lessonIndex, formData);
        }
      } else {
        addLessonToCourse(courseId, formData);
      }
    };

    const handleMediaUpload = (files: any[], type: 'image' | 'audio') => {
      if (files.length > 0) {
        const file = files[0];
        if (type === 'image') {
          setFormData({ ...formData, imageUrl: file.url });
        } else {
          setFormData({ ...formData, audioUrl: file.url });
        }
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lesson-title">Lesson Title</Label>
            <Input
              id="lesson-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Lesson title"
              required
            />
          </div>
          <div>
            <Label htmlFor="lesson-type">Lesson Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="lesson-content">Content</Label>
          <Textarea
            id="lesson-content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Lesson content..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 10 })}
          />
        </div>

        {/* Image Upload */}
        <div>
          <Label>Lesson Image</Label>
          <MediaUploader
            onFilesUploaded={(files) => handleMediaUpload(files, 'image')}
            allowedTypes={['image']}
            maxFiles={1}
            bucketName="course-materials"
          />
          {formData.imageUrl && (
            <div className="mt-2">
              <img src={formData.imageUrl} alt="Preview" className="max-w-xs rounded-lg" />
            </div>
          )}
        </div>

        {/* Audio Upload */}
        <div>
          <Label>Lesson Audio</Label>
          <MediaUploader
            onFilesUploaded={(files) => handleMediaUpload(files, 'audio')}
            allowedTypes={['audio']}
            maxFiles={1}
            bucketName="course-materials"
          />
          {formData.audioUrl && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Uploaded Audio</p>
              <audio controls src={formData.audioUrl} className="w-full" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowLessonModal(false)}>
            Cancel
          </Button>
          <Button type="submit">
            {lesson ? 'Update Lesson' : 'Add Lesson'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground">Create and manage multimedia courses</p>
        </div>
        <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingCourse(null);
                setShowCourseModal(true);
              }}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </DialogTitle>
            </DialogHeader>
            <CourseForm course={editingCourse} />
          </DialogContent>
        </Dialog>
      </div>

      {/* ZIP Import Section */}
      <CourseZipUploader />

      {/* Course List */}
      <div className="grid gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge variant={course.is_published ? "default" : "secondary"}>
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline">
                      {formatCurrency(course.price)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration_hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.content?.length || 0} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {course.difficulty_level}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCourse(course);
                      setShowCourseModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCourse(course.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="lessons">
                <TabsList>
                  <TabsTrigger value="lessons">Lessons</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="lessons" className="space-y-4">
                  <div className="flex justify-end">
                    <Dialog open={showLessonModal} onOpenChange={setShowLessonModal}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingLesson(null);
                            setShowLessonModal(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Lesson
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                          </DialogTitle>
                        </DialogHeader>
                        <LessonForm lesson={editingLesson} courseId={course.id} />
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2">
                    {course.content?.map((lesson: any, index: number) => (
                      <div 
                        key={lesson.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getLessonTypeIcon(lesson.type)}
                          </div>
                          <div>
                            <p className="font-medium">{lesson.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {lesson.type}
                              </Badge>
                              {lesson.duration && (
                                <span>{lesson.duration}m</span>
                              )}
                              {lesson.audioUrl && (
                                <Music className="w-3 h-3 text-green-500" />
                              )}
                              {lesson.imageUrl && (
                                <ImageIcon className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLesson(lesson);
                            setShowLessonModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {(!course.content || course.content.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No lessons yet. Add your first lesson to get started.
                      </p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Course ID:</strong> {course.id}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(course.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Tags:</strong> {course.tags?.join(', ') || 'None'}
                    </div>
                    <div>
                      <strong>Instructor:</strong> {course.instructor_id}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first course to get started with the LMS.
          </p>
          <Button 
            onClick={() => {
              setEditingCourse(null);
              setShowCourseModal(true);
            }}
            className="bg-gradient-to-r from-primary to-accent"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Course
          </Button>
        </div>
      )}
    </div>
  );
}