import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Trophy, 
  Star,
  BarChart3,
  Calendar,
  FileText,
  Award,
  TrendingUp,
  Users,
  Zap,
  Brain,
  BookOpen,
  Eye,
  Edit3,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

interface AssessmentSystemProps {
  courseId?: string;
}

export function AssessmentSystem({ courseId }: AssessmentSystemProps) {
  // Clean state - no mock assessments
  const [assessments, setAssessments] = useState<any[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<any[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  // Stats start at zero
  const [stats, setStats] = useState({
    totalAssessments: 0,
    completed: 0,
    pending: 0,
    averageScore: 0,
    totalPoints: 0,
    streak: 0
  });

  // Empty state components
  const EmptyAssessmentsState = () => (
    <div className="text-center py-16">
      <Target className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Assessments Available</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Assessments will appear here when you enroll in courses or when instructors create new quizzes and exams.
      </p>
      <div className="space-y-3">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
          <BookOpen className="h-4 w-4 mr-2" />
          Browse Courses
        </Button>
        <p className="text-sm text-muted-foreground">
          Enroll in courses to access assessments and track your progress
        </p>
      </div>
    </div>
  );

  const EmptyResultsState = () => (
    <Card>
      <CardContent className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
        <p className="text-muted-foreground mb-6">
          Complete assessments to see your performance and progress
        </p>
        <Button variant="outline">
          <Target className="h-4 w-4 mr-2" />
          Take Your First Assessment
        </Button>
      </CardContent>
    </Card>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">No assessments available</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Complete your first assessment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">No scores yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Earn points by completing assessments</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/30 dark:to-purple-950/30">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assessment Center</h1>
            <p className="text-muted-foreground mt-2">
              Test your knowledge and earn certificates
            </p>
          </div>

          <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
            <Plus className="h-4 w-4 mr-2" />
            Create Assessment
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Stats */}
            <StatsCards />

            <Tabs defaultValue="available" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
              </TabsList>

              <TabsContent value="available">
                {assessments.length === 0 ? (
                  <EmptyAssessmentsState />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Assessment cards would be rendered here */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed">
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Assessments</h3>
                    <p className="text-muted-foreground">
                      Your completed assessments and scores will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <EmptyResultsState />
              </TabsContent>

              <TabsContent value="certificates">
                <Card>
                  <CardContent className="text-center py-12">
                    <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Certificates Earned</h3>
                    <p className="text-muted-foreground mb-6">
                      Complete courses and assessments to earn certificates
                    </p>
                    <Button variant="outline">
                      <Trophy className="h-4 w-4 mr-2" />
                      View Achievement Requirements
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}