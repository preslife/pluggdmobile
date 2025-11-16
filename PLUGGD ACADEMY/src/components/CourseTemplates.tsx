import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Search, 
  Filter,
  Eye,
  Heart,
  Download,
  Play,
  FileText,
  Code,
  Palette,
  Camera,
  TrendingUp,
  Target,
  Lightbulb,
  Rocket,
  Brain,
  Zap,
  Gamepad2,
  Music,
  Dumbbell,
  Calculator,
  Globe,
  Briefcase,
  GraduationCap,
  ChefHat,
  Wrench,
  PenTool,
  Languages,
  DollarSign,
  ShoppingCart,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface CourseTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  modules: number;
  lessons: number;
  students: number;
  rating: number;
  price: 'Free' | 'Premium';
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  tags: string[];
  preview: {
    modules: Array<{
      title: string;
      lessons: string[];
    }>;
  };
}

interface CourseTemplatesProps {
  onNavigate: (view: string, data?: any) => void;
}

export function CourseTemplates({ onNavigate }: CourseTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const courseTemplates: CourseTemplate[] = [
    {
      id: 'web-dev-bootcamp',
      title: 'Complete Web Development Bootcamp',
      description: 'Comprehensive course covering HTML, CSS, JavaScript, React, and backend development',
      category: 'Technology',
      difficulty: 'Beginner',
      duration: '12 weeks',
      modules: 8,
      lessons: 120,
      students: 15420,
      rating: 4.9,
      price: 'Premium',
      icon: Code,
      color: 'from-blue-500 to-cyan-500',
      features: ['Project-based learning', 'Code reviews', 'Career guidance', 'Certificate'],
      tags: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
      preview: {
        modules: [
          { title: 'HTML Fundamentals', lessons: ['Introduction to HTML', 'Semantic HTML', 'Forms and Input', 'HTML5 Features'] },
          { title: 'CSS Mastery', lessons: ['CSS Basics', 'Flexbox', 'Grid Layout', 'Responsive Design'] },
          { title: 'JavaScript Essentials', lessons: ['Variables and Functions', 'DOM Manipulation', 'Events', 'Async Programming'] },
          { title: 'React Development', lessons: ['Components', 'State Management', 'Hooks', 'React Router'] }
        ]
      }
    },
    {
      id: 'digital-marketing',
      title: 'Digital Marketing Mastery',
      description: 'Learn SEO, social media marketing, email campaigns, and analytics',
      category: 'Marketing',
      difficulty: 'Intermediate',
      duration: '8 weeks',
      modules: 6,
      lessons: 85,
      students: 8950,
      rating: 4.7,
      price: 'Premium',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      features: ['Real campaigns', 'Tools access', 'Strategy templates', 'Analytics'],
      tags: ['SEO', 'Social Media', 'Email Marketing', 'Analytics'],
      preview: {
        modules: [
          { title: 'Marketing Fundamentals', lessons: ['Marketing Strategy', 'Target Audience', 'Brand Positioning'] },
          { title: 'SEO Optimization', lessons: ['Keyword Research', 'On-page SEO', 'Link Building'] },
          { title: 'Social Media Marketing', lessons: ['Platform Strategy', 'Content Creation', 'Engagement'] },
          { title: 'Email Marketing', lessons: ['List Building', 'Campaign Design', 'Automation'] }
        ]
      }
    },
    {
      id: 'graphic-design-basics',
      title: 'Graphic Design Fundamentals',
      description: 'Master design principles, typography, color theory, and Adobe Creative Suite',
      category: 'Design',
      difficulty: 'Beginner',
      duration: '6 weeks',
      modules: 5,
      lessons: 65,
      students: 12300,
      rating: 4.8,
      price: 'Free',
      icon: Palette,
      color: 'from-orange-500 to-red-500',
      features: ['Design projects', 'Software tutorials', 'Portfolio building', 'Feedback'],
      tags: ['Photoshop', 'Illustrator', 'Typography', 'Color Theory'],
      preview: {
        modules: [
          { title: 'Design Principles', lessons: ['Visual Hierarchy', 'Balance and Composition', 'Contrast and Emphasis'] },
          { title: 'Typography', lessons: ['Font Selection', 'Text Layout', 'Readability'] },
          { title: 'Color Theory', lessons: ['Color Wheel', 'Color Schemes', 'Psychology of Color'] },
          { title: 'Adobe Photoshop', lessons: ['Interface Overview', 'Tools and Layers', 'Photo Editing'] }
        ]
      }
    },
    {
      id: 'photography-masterclass',
      title: 'Photography Masterclass',
      description: 'From camera basics to advanced techniques and post-processing',
      category: 'Creative',
      difficulty: 'Intermediate',
      duration: '10 weeks',
      modules: 7,
      lessons: 95,
      students: 6780,
      rating: 4.9,
      price: 'Premium',
      icon: Camera,
      color: 'from-green-500 to-teal-500',
      features: ['Photo assignments', 'Critique sessions', 'Equipment guides', 'Gallery showcase'],
      tags: ['DSLR', 'Composition', 'Lightroom', 'Portrait', 'Landscape'],
      preview: {
        modules: [
          { title: 'Camera Fundamentals', lessons: ['Camera Types', 'Exposure Triangle', 'Focus and Depth'] },
          { title: 'Composition Techniques', lessons: ['Rule of Thirds', 'Leading Lines', 'Framing'] },
          { title: 'Portrait Photography', lessons: ['Lighting', 'Posing', 'Background Selection'] },
          { title: 'Post-Processing', lessons: ['Lightroom Basics', 'Color Grading', 'Retouching'] }
        ]
      }
    },
    {
      id: 'business-strategy',
      title: 'Business Strategy & Planning',
      description: 'Learn strategic thinking, market analysis, and business plan development',
      category: 'Business',
      difficulty: 'Advanced',
      duration: '10 weeks',
      modules: 8,
      lessons: 110,
      students: 4560,
      rating: 4.6,
      price: 'Premium',
      icon: Briefcase,
      color: 'from-indigo-500 to-purple-500',
      features: ['Case studies', 'Business templates', 'Mentor sessions', 'Networking'],
      tags: ['Strategy', 'Planning', 'Analysis', 'Leadership'],
      preview: {
        modules: [
          { title: 'Strategic Thinking', lessons: ['Vision and Mission', 'SWOT Analysis', 'Competitive Advantage'] },
          { title: 'Market Analysis', lessons: ['Market Research', 'Customer Segmentation', 'Trend Analysis'] },
          { title: 'Business Planning', lessons: ['Business Model Canvas', 'Financial Projections', 'Risk Assessment'] },
          { title: 'Implementation', lessons: ['Project Management', 'Team Building', 'Performance Metrics'] }
        ]
      }
    },
    {
      id: 'language-learning',
      title: 'Language Learning Framework',
      description: 'Interactive language course template with conversation practice',
      category: 'Education',
      difficulty: 'Beginner',
      duration: '16 weeks',
      modules: 12,
      lessons: 180,
      students: 22100,
      rating: 4.8,
      price: 'Free',
      icon: Languages,
      color: 'from-yellow-500 to-orange-500',
      features: ['Interactive exercises', 'Speaking practice', 'Cultural insights', 'Progress tracking'],
      tags: ['Vocabulary', 'Grammar', 'Pronunciation', 'Conversation'],
      preview: {
        modules: [
          { title: 'Basic Vocabulary', lessons: ['Greetings', 'Numbers', 'Family', 'Food'] },
          { title: 'Grammar Fundamentals', lessons: ['Sentence Structure', 'Verb Tenses', 'Articles'] },
          { title: 'Conversation Practice', lessons: ['Daily Situations', 'Travel Phrases', 'Small Talk'] },
          { title: 'Cultural Context', lessons: ['Customs', 'Etiquette', 'History', 'Traditions'] }
        ]
      }
    },
    {
      id: 'fitness-training',
      title: 'Personal Fitness & Nutrition',
      description: 'Complete guide to fitness, exercise routines, and healthy eating',
      category: 'Health',
      difficulty: 'Beginner',
      duration: '12 weeks',
      modules: 9,
      lessons: 135,
      students: 18700,
      rating: 4.7,
      price: 'Premium',
      icon: Dumbbell,
      color: 'from-red-500 to-pink-500',
      features: ['Workout videos', 'Meal plans', 'Progress tracking', 'Community support'],
      tags: ['Exercise', 'Nutrition', 'Wellness', 'Motivation'],
      preview: {
        modules: [
          { title: 'Fitness Fundamentals', lessons: ['Exercise Types', 'Form and Technique', 'Safety Guidelines'] },
          { title: 'Strength Training', lessons: ['Weight Lifting', 'Bodyweight Exercises', 'Progressive Overload'] },
          { title: 'Cardio Workouts', lessons: ['Running', 'Cycling', 'HIIT Training'] },
          { title: 'Nutrition Basics', lessons: ['Macronutrients', 'Meal Planning', 'Hydration'] }
        ]
      }
    },
    {
      id: 'data-science',
      title: 'Data Science & Analytics',
      description: 'Python, SQL, machine learning, and data visualization',
      category: 'Technology',
      difficulty: 'Advanced',
      duration: '16 weeks',
      modules: 10,
      lessons: 160,
      students: 7820,
      rating: 4.9,
      price: 'Premium',
      icon: Calculator,
      color: 'from-teal-500 to-blue-500',
      features: ['Hands-on projects', 'Real datasets', 'Jupyter notebooks', 'Career prep'],
      tags: ['Python', 'SQL', 'Machine Learning', 'Visualization'],
      preview: {
        modules: [
          { title: 'Python for Data Science', lessons: ['Python Basics', 'Pandas', 'NumPy', 'Data Cleaning'] },
          { title: 'SQL and Databases', lessons: ['Query Fundamentals', 'Joins', 'Aggregations', 'Optimization'] },
          { title: 'Data Visualization', lessons: ['Matplotlib', 'Seaborn', 'Plotly', 'Dashboard Creation'] },
          { title: 'Machine Learning', lessons: ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation'] }
        ]
      }
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', count: courseTemplates.length },
    { id: 'Technology', name: 'Technology', count: courseTemplates.filter(t => t.category === 'Technology').length },
    { id: 'Marketing', name: 'Marketing', count: courseTemplates.filter(t => t.category === 'Marketing').length },
    { id: 'Design', name: 'Design', count: courseTemplates.filter(t => t.category === 'Design').length },
    { id: 'Business', name: 'Business', count: courseTemplates.filter(t => t.category === 'Business').length },
    { id: 'Creative', name: 'Creative', count: courseTemplates.filter(t => t.category === 'Creative').length },
    { id: 'Education', name: 'Education', count: courseTemplates.filter(t => t.category === 'Education').length },
    { id: 'Health', name: 'Health', count: courseTemplates.filter(t => t.category === 'Health').length }
  ];

  const filteredTemplates = courseTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const useTemplate = (template: CourseTemplate) => {
    toast.success(`🚀 Using "${template.title}" template!`, {
      description: 'Redirecting to Course Creator with template structure',
      duration: 3000
    });
    
    // Navigate to content creator with template data
    setTimeout(() => {
      onNavigate('content-creator', { template });
    }, 1000);
  };

  const previewTemplate = (template: CourseTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50/30 to-orange-50/30 dark:from-purple-950/30 dark:to-orange-950/30">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Course Templates
            </motion.h1>
            <motion.p 
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Choose from professionally designed course templates to jumpstart your creation
            </motion.p>
          </div>
          
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              variant="outline"
              onClick={() => onNavigate('content-creator')}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Start from Scratch
            </Button>
            <Button 
              onClick={() => onNavigate('courses')}
              className="bg-gradient-to-r from-purple-500 to-orange-500"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              My Courses
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex-shrink-0 p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
                size="sm"
              >
                {category.name}
                <Badge variant="secondary" className="ml-2">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {filteredTemplates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${template.color} text-white`}>
                            <template.icon className="h-6 w-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={template.price === 'Free' ? 'secondary' : 'default'}>
                              {template.price}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <CardTitle className="text-lg">{template.title}</CardTitle>
                          <CardDescription className="text-sm line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {template.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {template.modules} modules
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {template.students.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{template.rating}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {template.lessons} lessons
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewTemplate(template)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => useTemplate(template)}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-orange-500"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Use Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedTemplate.color} text-white`}>
                    <selectedTemplate.icon className="h-5 w-5" />
                  </div>
                  {selectedTemplate.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-6 py-4">
                  {/* Course Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedTemplate.modules}</div>
                      <div className="text-sm text-muted-foreground">Modules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedTemplate.lessons}</div>
                      <div className="text-sm text-muted-foreground">Lessons</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedTemplate.duration}</div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedTemplate.rating}</div>
                      <div className="text-sm text-muted-foreground">Rating</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold mb-3">Template Features</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedTemplate.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Course Structure */}
                  <div>
                    <h4 className="font-semibold mb-3">Course Structure Preview</h4>
                    <div className="space-y-4">
                      {selectedTemplate.preview.modules.map((module, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              {module.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <div key={lessonIndex} className="flex items-center gap-2 text-sm">
                                  <Play className="h-3 w-3 text-muted-foreground" />
                                  <span>{lesson}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="font-semibold mb-3">Skills Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
            <Button 
              onClick={() => {
                if (selectedTemplate) {
                  useTemplate(selectedTemplate);
                  setShowPreview(false);
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-orange-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}