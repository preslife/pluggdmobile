import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  Mail, 
  Phone,
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserX,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledCourses: number;
  completedCourses: number;
  currentStreak: number;
  totalPoints: number;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  phone?: string;
}

export function StudentManagement() {
  // Clean state - no mock students
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats - all start at zero with no students
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const totalEnrollments = students.reduce((sum, s) => sum + s.enrolledCourses, 0);
  const avgCompletion = students.length > 0 ? 
    students.reduce((sum, s) => sum + (s.completedCourses / Math.max(s.enrolledCourses, 1)), 0) / students.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'inactive': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'suspended': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Empty state component
  const EmptyStudentsState = () => (
    <div className="text-center py-16">
      <GraduationCap className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Students Enrolled Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Students will appear here once they register and enroll in courses. 
        Create courses first to attract learners to your platform.
      </p>
      <div className="space-y-3">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Students
        </Button>
        <p className="text-sm text-muted-foreground">
          Students will be able to self-register when courses are available
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50/30 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Student Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student accounts, track progress, and monitor engagement
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeStudents}</p>
                <p className="text-sm text-muted-foreground">Active Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgCompletion * 100)}%</p>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={selectedStatus === 'inactive' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('inactive')}
                size="sm"
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List or Empty State */}
      <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
          <CardDescription>
            Manage student accounts and monitor their progress
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <EmptyStudentsState />
          ) : (
            <div className="overflow-auto h-full">
              <div className="space-y-1 p-6 pt-0">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-medium">{student.enrolledCourses}</p>
                        <p className="text-xs text-muted-foreground">Enrolled</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{student.completedCourses}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{student.currentStreak}</p>
                        <p className="text-xs text-muted-foreground">Day Streak</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{student.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">Points</p>
                      </div>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}