import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  Trash2, 
  Users, 
  BarChart3, 
  Clock, 
  Star,
  Settings,
  Upload,
  Download,
  Copy,
  Share,
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Calendar,
  FileText,
  Video,
  PlayCircle,
  Pause,
  Sparkles,
  Brain,
  Filter,
  MoreHorizontal,
  DollarSign,
  Zap,
  Award,
  MessageSquare,
  Heart,
  ShoppingCart,
  GraduationCap,
  Crown,
  ThumbsUp,
  Flag,
  RotateCcw,
  Save,
  X,
  ImageIcon,
  Link,
  Tag,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
  Archive,
  Trash,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    title: string;
    rating: number;
    students: number;
  };
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessons: number;
  rating: number;
  reviews: number;
  price: number;
  originalPrice?: number;
  isFree: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
  language: string;
  lastUpdated: string;
  createdAt: string;
  enrollments: number;
  revenue: number;
  completionRate: number;
  skills: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
}

interface CourseManagementProps {
  onNavigate: (view: string, data?: any) => void;
}

export function CourseManagement({ onNavigate }: CourseManagementProps) {
  // Clean state - no mock course data
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Course editing
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // Stats - start at zero
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalRevenue: 0,
    totalEnrollments: 0,
    averageRating: 0
  });

  // Categories
  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'Web Development', name: 'Web Development' },
    { id: 'Frontend Development', name: 'Frontend Development' },
    { id: 'Data Science', name: 'Data Science' },
    { id: 'Mobile Development', name: 'Mobile Development' },
    { id: 'Backend Development', name: 'Backend Development' },
    { id: 'Design', name: 'Design' },
    { id: 'Marketing', name: 'Marketing' }
  ];

  const statusOptions = [
    { id: 'all', name: 'All Status' },
    { id: 'draft', name: 'Draft' },
    { id: 'review', name: 'Under Review' },
    { id: 'published', name: 'Published' },
    { id: 'archived', name: 'Archived' }
  ];

  // Update stats when courses change
  useEffect(() => {
    setStats({
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.isPublished).length,
      draftCourses: courses.filter(c => c.status === 'draft').length,
      totalRevenue: courses.reduce((acc, c) => acc + c.revenue, 0),
      totalEnrollments: courses.reduce((acc, c) => acc + c.enrollments, 0),
      averageRating: courses.length > 0 ? courses.reduce((acc, c) => acc + c.rating, 0) / courses.length : 0
    });
  }, [courses]);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(course => course.status === selectedStatus);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aVal = new Date(a.lastUpdated).getTime();
          bVal = new Date(b.lastUpdated).getTime();
          break;
        case 'enrollments':
          aVal = a.enrollments;
          bVal = b.enrollments;
          break;
        case 'revenue':
          aVal = a.revenue;
          bVal = b.revenue;
          break;
        case 'rating':
          aVal = a.rating;
          bVal = b.rating;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedStatus, selectedCategory, sortBy, sortOrder]);

  // Course actions
  const toggleCourseStatus = (courseId: string, field: 'isPublished' | 'isFeatured' | 'isBestseller') => {
    setCourses(prev => prev.map(course => 
      course.id === courseId 
        ? { ...course, [field]: !course[field] }
        : course
    ));
    toast.success(`Course ${field} updated successfully`);
  };

  const deleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(course => course.id !== courseId));
    toast.success('Course deleted successfully');
  };

  const duplicateCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const newCourse = {
        ...course,
        id: `${courseId}-copy`,
        title: `${course.title} (Copy)`,
        isPublished: false,
        status: 'draft' as const,
        enrollments: 0,
        revenue: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      setCourses(prev => [newCourse, ...prev]);
      toast.success('Course duplicated successfully');
    }
  };

  const openCourseEditor = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseEditor(true);
  };

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId 
        ? { ...course, ...updates, lastUpdated: new Date().toISOString() }
        : course
    ));
    toast.success('Course updated successfully');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.floor(rating) 
          ? 'text-yellow-400 fill-yellow-400' 
          : i < rating 
            ? 'text-yellow-400 fill-yellow-400/50' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Empty state component
  const EmptyCoursesState = () => (
    <div className="text-center py-16">
      <BookOpen className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Courses Created Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Start building your educational platform by creating your first course. Use the Content Creator to build engaging learning experiences.
      </p>
      <div className="space-y-3">
        <Button 
          onClick={() => onNavigate('content-creator')}
          className="bg-gradient-to-r from-blue-500 to-purple-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Course
        </Button>
        <p className="text-sm text-muted-foreground">
          Build courses with videos, quizzes, and interactive content
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50/30 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Course Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage {filteredCourses.length} courses • ${stats.totalRevenue.toLocaleString()} total revenue
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => onNavigate('analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button 
              onClick={() => onNavigate('content-creator')}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-bold">{stats.totalCourses}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="font-bold">{stats.publishedCourses}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="font-bold">{stats.draftCourses}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Enrollments</p>
                <p className="font-bold">{stats.totalEnrollments.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="font-bold">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses, instructors, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-12"
              />
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center gap-3">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="enrollments">Enrollments</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>

            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Course Grid/List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {filteredCourses.length === 0 ? (
              <EmptyCoursesState />
            ) : (
              <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                  <motion.div 
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {/* Course cards would be rendered here when courses exist */}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Course list items would be rendered here when courses exist */}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Course Editor Dialog - Clean state */}
      <Dialog open={showCourseEditor} onOpenChange={setShowCourseEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Course: {selectedCourse.title}</DialogTitle>
                <DialogDescription>
                  Manage course details, pricing, and marketplace settings
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <p>Course editor interface would be displayed here.</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCourseEditor(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCourseEditor(false)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}