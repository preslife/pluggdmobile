import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { 
  BookOpen, 
  Play, 
  Clock, 
  User, 
  Star, 
  Search, 
  Filter, 
  PlayCircle,
  CheckCircle2,
  Users,
  Calendar,
  TrendingUp,
  Award,
  Target,
  Zap,
  Heart,
  Share,
  ShoppingCart,
  Eye,
  Download,
  ChevronRight,
  Plus,
  Sparkles,
  Brain,
  Globe,
  DollarSign,
  BarChart3,
  Bookmark,
  BookmarkPlus,
  UserCheck,
  GraduationCap,
  Trophy,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  Video,
  FileText,
  Headphones,
  Code,
  PieChart,
  Lightbulb,
  Rocket,
  Shield,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Grid3x3,
  List,
  MapPin,
  Languages
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
  isEnrolled: boolean;
  isBestseller: boolean;
  isNew: boolean;
  language: string;
  lastUpdated: string;
  skills: string[];
  preview: {
    videoUrl?: string;
    sampleLessons: string[];
  };
  curriculum: {
    modules: {
      title: string;
      lessons: {
        title: string;
        duration: string;
        isPreview: boolean;
      }[];
    }[];
  };
  whatYoullLearn: string[];
  requirements: string[];
  targetAudience: string[];
}

interface ClassroomProps {
  course?: any;
  onNavigate: (view: string, data?: any) => void;
}

export function Classroom({ course, onNavigate }: ClassroomProps) {
  // Clean state - no mock courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [selectedRating, setSelectedRating] = useState(0);
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 200]);
  
  // Course details modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  
  // Cart and wishlist - start empty
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Categories for filtering - start with zero counts
  const categories = [
    { id: 'all', name: 'All Categories', count: 0 },
    { id: 'Web Development', name: 'Web Development', count: 0 },
    { id: 'Frontend Development', name: 'Frontend Development', count: 0 },
    { id: 'Data Science', name: 'Data Science', count: 0 },
    { id: 'Mobile Development', name: 'Mobile Development', count: 0 },
    { id: 'Backend Development', name: 'Backend Development', count: 0 },
    { id: 'Design', name: 'Design', count: 0 },
    { id: 'Marketing', name: 'Marketing', count: 0 }
  ];

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

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    // Price filter
    if (selectedPrice !== 'all') {
      switch (selectedPrice) {
        case 'free':
          filtered = filtered.filter(course => course.isFree);
          break;
        case 'paid':
          filtered = filtered.filter(course => !course.isFree);
          break;
        case 'range':
          filtered = filtered.filter(course => 
            course.price >= priceRange[0] && course.price <= priceRange[1]
          );
          break;
      }
    }

    // Rating filter
    if (selectedRating > 0) {
      filtered = filtered.filter(course => course.rating >= selectedRating);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.reviews - a.reviews);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'duration':
        filtered.sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
        break;
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedCategory, selectedDifficulty, selectedPrice, selectedRating, sortBy, priceRange]);

  // Course actions
  const addToCart = (courseId: string) => {
    setCartItems(prev => [...prev, courseId]);
    toast.success('Course added to cart!');
  };

  const addToWishlist = (courseId: string) => {
    setWishlist(prev => [...prev, courseId]);
    toast.success('Course added to wishlist!');
  };

  const enrollInCourse = (courseId: string) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId ? { ...course, isEnrolled: true } : course
    ));
    toast.success('Successfully enrolled in course!');
  };

  const openCourseDetails = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) 
          ? 'text-yellow-400 fill-yellow-400' 
          : i < rating 
            ? 'text-yellow-400 fill-yellow-400/50' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Empty state component
  const EmptyCoursesState = () => (
    <div className="text-center py-16">
      <BookOpen className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Courses Available</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Courses will appear here once instructors create and publish content. Check back soon!
      </p>
      <div className="space-y-3">
        <Button onClick={() => onNavigate('content-creator')} className="bg-gradient-to-r from-blue-500 to-purple-500">
          <Plus className="h-4 w-4 mr-2" />
          Create a Course
        </Button>
        <p className="text-sm text-muted-foreground">
          Switch to admin mode to start creating educational content
        </p>
      </div>
    </div>
  );

  const FiltersPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div>
          <h4 className="font-medium mb-3">Category</h4>
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategory === category.id}
                    onCheckedChange={() => setSelectedCategory(category.id)}
                  />
                  <label htmlFor={category.id} className="text-sm cursor-pointer">
                    {category.name}
                  </label>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({category.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Difficulty */}
        <div>
          <h4 className="font-medium mb-3">Difficulty Level</h4>
          <div className="space-y-2">
            {['all', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`difficulty-${level}`}
                  checked={selectedDifficulty === level}
                  onCheckedChange={() => setSelectedDifficulty(level)}
                />
                <label htmlFor={`difficulty-${level}`} className="text-sm cursor-pointer">
                  {level === 'all' ? 'All Levels' : level}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price */}
        <div>
          <h4 className="font-medium mb-3">Price</h4>
          <div className="space-y-2">
            {[
              { id: 'all', label: 'All Courses' },
              { id: 'free', label: 'Free' },
              { id: 'paid', label: 'Paid' }
            ].map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${option.id}`}
                  checked={selectedPrice === option.id}
                  onCheckedChange={() => setSelectedPrice(option.id)}
                />
                <label htmlFor={`price-${option.id}`} className="text-sm cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Rating */}
        <div>
          <h4 className="font-medium mb-3">Minimum Rating</h4>
          <div className="space-y-2">
            {[0, 3, 4, 4.5].map(rating => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating}`}
                  checked={selectedRating === rating}
                  onCheckedChange={() => setSelectedRating(rating)}
                />
                <label htmlFor={`rating-${rating}`} className="text-sm cursor-pointer flex items-center gap-1">
                  {rating === 0 ? 'All Ratings' : (
                    <>
                      {renderStars(rating)}
                      <span className="ml-1">{rating}+ stars</span>
                    </>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/30 dark:to-purple-950/30">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Course Marketplace</h1>
            <p className="text-muted-foreground mt-2">
              Discover and enroll in courses • {filteredCourses.length} available
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onNavigate('recommendations')}>
              <Brain className="h-4 w-4 mr-2" />
              Get Recommendations
            </Button>
            <Button onClick={() => onNavigate('content-creator')} className="bg-gradient-to-r from-blue-500 to-purple-500">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </div>
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

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="duration">Shortest Duration</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
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

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="flex gap-6">
              {/* Filters Sidebar */}
              {showFilters && (
                <div className="w-80 flex-shrink-0">
                  <FiltersPanel />
                </div>
              )}

              {/* Course Grid */}
              <div className="flex-1">
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
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Course Details Modal - Clean state */}
      <Dialog open={showCourseDetails} onOpenChange={setShowCourseDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>
                  Course details and enrollment information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <p>Course details would be displayed here.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCourseDetails(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}