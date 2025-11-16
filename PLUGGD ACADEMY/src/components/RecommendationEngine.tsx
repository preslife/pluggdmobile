import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { 
  Brain, 
  Sparkles, 
  Target, 
  BookOpen, 
  TrendingUp, 
  Users, 
  Clock,
  Star,
  Zap,
  Search,
  Filter,
  RefreshCw,
  Lightbulb,
  Rocket,
  Award,
  Globe,
  Heart,
  Settings,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface UserPreferences {
  interests: string[];
  careerGoals: string[];
  learningStyle: string;
  timeCommitment: string;
  currentSkillLevel: string;
  preferredFormat: string[];
}

export function RecommendationEngine() {
  // Clean state - no mock data
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [personalizedCourses, setPersonalizedCourses] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPreferences, setHasPreferences] = useState(false);

  // User preferences - starts empty
  const [preferences, setPreferences] = useState<UserPreferences>({
    interests: [],
    careerGoals: [],
    learningStyle: '',
    timeCommitment: '',
    currentSkillLevel: '',
    preferredFormat: []
  });

  // Preference options
  const interestOptions = [
    'Programming', 'Data Science', 'Web Development', 'Mobile Development',
    'AI/Machine Learning', 'Cybersecurity', 'Cloud Computing', 'DevOps',
    'Digital Marketing', 'Business Strategy', 'Design', 'Finance',
    'Project Management', 'Leadership', 'Communication', 'Personal Development'
  ];

  const careerGoalOptions = [
    'Switch Careers', 'Get Promoted', 'Start a Business', 'Freelancing',
    'Skill Enhancement', 'Academic Achievement', 'Personal Interest',
    'Professional Certification', 'Industry Transition', 'Leadership Role'
  ];

  const learningStyleOptions = [
    { id: 'visual', name: 'Visual (videos, diagrams, infographics)' },
    { id: 'auditory', name: 'Auditory (lectures, discussions, podcasts)' },
    { id: 'hands-on', name: 'Hands-on (projects, practice, labs)' },
    { id: 'reading', name: 'Reading/Writing (articles, notes, exercises)' }
  ];

  const timeCommitmentOptions = [
    { id: '1-2', name: '1-2 hours per week' },
    { id: '3-5', name: '3-5 hours per week' },
    { id: '6-10', name: '6-10 hours per week' },
    { id: '10+', name: '10+ hours per week' }
  ];

  const skillLevelOptions = [
    { id: 'beginner', name: 'Beginner - New to the field' },
    { id: 'intermediate', name: 'Intermediate - Some experience' },
    { id: 'advanced', name: 'Advanced - Experienced professional' }
  ];

  const formatOptions = [
    'Video Courses', 'Interactive Tutorials', 'Live Classes', 'Reading Materials',
    'Hands-on Projects', 'Assessments & Quizzes', 'Community Discussions', 'Mentorship'
  ];

  // Empty state components
  const PreferenceSetup = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Get Personalized Recommendations</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tell us about your learning goals and preferences to receive AI-powered 
              course recommendations tailored just for you.
            </p>
          </div>

          <Tabs defaultValue="interests" className="max-w-2xl mx-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="interests">Interests</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="format">Format</TabsTrigger>
            </TabsList>

            <TabsContent value="interests" className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold mb-3">What subjects interest you?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {interestOptions.map(interest => (
                    <div key={interest} className="flex items-center space-x-2">
                      <Checkbox 
                        id={interest}
                        checked={preferences.interests.includes(interest)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPreferences(prev => ({
                              ...prev,
                              interests: [...prev.interests, interest]
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              interests: prev.interests.filter(i => i !== interest)
                            }));
                          }
                        }}
                      />
                      <label htmlFor={interest} className="text-sm">{interest}</label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold mb-3">What are your career goals?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {careerGoalOptions.map(goal => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox 
                        id={goal}
                        checked={preferences.careerGoals.includes(goal)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPreferences(prev => ({
                              ...prev,
                              careerGoals: [...prev.careerGoals, goal]
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              careerGoals: prev.careerGoals.filter(g => g !== goal)
                            }));
                          }
                        }}
                      />
                      <label htmlFor={goal} className="text-sm">{goal}</label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">How do you prefer to learn?</h3>
                  <Select 
                    value={preferences.learningStyle} 
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, learningStyle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select learning style" />
                    </SelectTrigger>
                    <SelectContent>
                      {learningStyleOptions.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">How much time can you dedicate?</h3>
                  <Select 
                    value={preferences.timeCommitment} 
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, timeCommitment: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time commitment" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeCommitmentOptions.map(time => (
                        <SelectItem key={time.id} value={time.id}>
                          {time.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">What's your current skill level?</h3>
                  <Select 
                    value={preferences.currentSkillLevel} 
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, currentSkillLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevelOptions.map(level => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="format" className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold mb-3">Preferred learning formats?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select all that you enjoy</p>
                <div className="grid grid-cols-2 gap-3">
                  {formatOptions.map(format => (
                    <div key={format} className="flex items-center space-x-2">
                      <Checkbox 
                        id={format}
                        checked={preferences.preferredFormat.includes(format)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPreferences(prev => ({
                              ...prev,
                              preferredFormat: [...prev.preferredFormat, format]
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              preferredFormat: prev.preferredFormat.filter(f => f !== format)
                            }));
                          }
                        }}
                      />
                      <label htmlFor={format} className="text-sm">{format}</label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-8">
            <Button 
              onClick={generateRecommendations}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
              disabled={preferences.interests.length === 0 || !preferences.learningStyle}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate My Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const generateRecommendations = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation process
    setTimeout(() => {
      // In a real implementation, this would call an AI API
      // For now, we'll show that preferences are set but no recommendations yet
      setHasPreferences(true);
      setIsGenerating(false);
    }, 3000);
  };

  const EmptyRecommendationsState = () => (
    <div className="text-center py-16">
      <Brain className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Recommendations Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Complete your learning preferences to receive personalized course recommendations 
        powered by AI.
      </p>
      <Button 
        onClick={() => setHasPreferences(false)}
        className="bg-gradient-to-r from-blue-500 to-purple-500"
      >
        <Settings className="h-4 w-4 mr-2" />
        Set Up Preferences
      </Button>
    </div>
  );

  // Show loading state when generating
  if (isGenerating) {
    return (
      <div className="p-6 space-y-6 min-h-full bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/30 dark:to-purple-950/30">
        <div className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Brain className="h-16 w-16 text-blue-500" />
          </motion.div>
          <h2 className="text-2xl font-bold mt-6 mb-4">AI is Analyzing Your Preferences</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Our recommendation engine is finding the perfect courses for your learning journey...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/30 dark:to-purple-950/30 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Recommendations
          </h1>
          <p className="text-muted-foreground mt-2">
            Personalized learning paths powered by artificial intelligence
          </p>
        </div>

        {hasPreferences && (
          <Button 
            onClick={() => setHasPreferences(false)}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Update Preferences
          </Button>
        )}
      </div>

      {/* Main Content */}
      {!hasPreferences ? (
        <PreferenceSetup />
      ) : recommendations.length === 0 ? (
        <EmptyRecommendationsState />
      ) : (
        <Tabs defaultValue="personalized" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="personalized">For You</TabsTrigger>
            <TabsTrigger value="paths">Learning Paths</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="similar">Similar Users</TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="space-y-6">
            {/* AI Recommendation Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI Analysis Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on your preferences, we found {recommendations.length} highly matching courses
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(recommendations.reduce((acc, r) => acc + r.matchScore, 0) / recommendations.length)}%</div>
                    <div className="text-sm text-muted-foreground">Average Match</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{preferences.interests.length}</div>
                    <div className="text-sm text-muted-foreground">Interests Matched</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{learningPaths.length}</div>
                    <div className="text-sm text-muted-foreground">Learning Paths</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personalized Course Recommendations */}
            <div className="space-y-4">
              {recommendations.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <img 
                          src={course.image} 
                          alt={course.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{course.title}</h3>
                              <p className="text-sm text-muted-foreground">by {course.instructor}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-green-100 text-green-700">
                                  {course.matchScore}% match
                                </Badge>
                                <Badge variant="outline">{course.level}</Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span>{course.rating}</span>
                                <span className="text-muted-foreground">({course.students.toLocaleString()})</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {course.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Why this matches you:</span>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                              {course.aiReasons.map((reason, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{course.duration}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                <span>{course.estimatedCompletion}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Heart className="h-4 w-4" />
                              </Button>
                              <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                                Enroll Now - ${course.price}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="paths" className="space-y-6">
            <div className="grid gap-6">
              {learningPaths.map((path, index) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-xl">{path.title}</h3>
                            {path.aiOptimized && (
                              <Badge className="bg-purple-100 text-purple-700">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Optimized
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{path.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{path.completionRate}%</div>
                          <div className="text-sm text-muted-foreground">completion rate</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{path.courses}</div>
                          <div className="text-sm text-muted-foreground">Courses</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{path.duration}</div>
                          <div className="text-sm text-muted-foreground">Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{path.estimatedHours}h</div>
                          <div className="text-sm text-muted-foreground">Total Hours</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{path.students.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Students</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Skills You'll Master:</h4>
                          <div className="flex flex-wrap gap-2">
                            {path.skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Key Milestones:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {path.milestones.map((milestone, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                {milestone}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Personalized for: {path.personalizedFor.slice(0, 2).join(', ')}
                          {path.personalizedFor.length > 2 && ` +${path.personalizedFor.length - 2} more`}
                        </div>
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                          <Rocket className="h-4 w-4 mr-2" />
                          Start Learning Path
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <div className="grid gap-4">
              {trending.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <TrendingUp className="h-8 w-8 text-green-500" />
                            {item.isHot && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{item.category}</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span>{item.rating}</span>
                              </div>
                              <span>{item.students.toLocaleString()} students</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-700 mb-2">
                            {item.trend}
                          </Badge>
                          {item.isHot && (
                            <div className="flex items-center gap-1 text-sm">
                              <Zap className="h-4 w-4 text-orange-500" />
                              <span className="text-orange-600 font-medium">Hot Topic</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="similar" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold text-lg">Learners Like You</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on similar learning preferences and goals
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">73%</div>
                    <div className="text-sm text-muted-foreground">Choose programming courses</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">89%</div>
                    <div className="text-sm text-muted-foreground">Complete their first course</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">6.2</div>
                    <div className="text-sm text-muted-foreground">Average courses per year</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Popular Next Steps:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-sm">Advanced JavaScript Concepts</span>
                      <Badge variant="outline">67% take this</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-sm">Python for Data Analysis</span>
                      <Badge variant="outline">54% take this</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-sm">Cloud Computing Fundamentals</span>
                      <Badge variant="outline">43% take this</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}