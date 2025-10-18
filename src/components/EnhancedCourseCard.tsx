import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Star, Play, Users, Award, Crown } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  content?: any;
  thumbnail_url?: string;
  price: number;
  difficulty_level: string;
  duration_hours: number;
  tags: string[];
  is_published: boolean;
  created_at?: string;
}

interface CourseProgress {
  completion_percentage: number;
  last_accessed_at: string;
  completed_at?: string;
}

interface EnhancedCourseCardProps {
  course: Course;
  progress?: CourseProgress;
  onEnroll?: (courseId: string) => void;
  onContinue?: (courseId: string) => void;
  showProgress?: boolean;
  isProOnly?: boolean;
  oneTimePrice?: number;
}

const getDifficultyColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'beginner':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'advanced':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDuration = (hours: number) => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours}h`;
};

export function EnhancedCourseCard({
  course,
  progress,
  onEnroll,
  onContinue,
  showProgress = false,
  isProOnly = false,
  oneTimePrice
}: EnhancedCourseCardProps) {
  const isEnrolled = !!progress;
  const isCompleted = progress?.completion_percentage === 100;
  const displayPrice = typeof oneTimePrice === 'number' ? oneTimePrice : course.price;
  const actionLabel = isEnrolled
    ? isCompleted
      ? 'Review'
      : 'Continue'
    : isProOnly
      ? 'Unlock Access'
      : displayPrice > 0
        ? 'Enroll Now'
        : 'Start Free';

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-md">
      {/* Course Image/Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-primary to-secondary overflow-hidden">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/80" />
          </div>
        )}
        
        {/* Pro Badge */}
        {isProOnly && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-purple-500 text-white border-purple-400">
              <Crown className="w-3 h-3 mr-1" />
              Pro Only
            </Badge>
          </div>
        )}

        {/* New Badge */}
        {course.created_at && new Date(course.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-500 text-white">
              New
            </Badge>
          </div>
        )}

        {/* Progress Ring for Enrolled Courses */}
        {showProgress && progress && (
          <div className="absolute bottom-3 right-3 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="text-primary"
                strokeDasharray={`${progress.completion_percentage}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {Math.round(progress.completion_percentage)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Course Category & Rating */}
        <div className="flex items-center justify-between mb-3">
          <Badge 
            variant="secondary" 
            className={getDifficultyColor(course.difficulty_level)}
          >
            {course.difficulty_level}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>4.9</span>
            <span className="text-xs">(128)</span>
          </div>
        </div>

        {/* Course Title & Description */}
        <CardTitle className="text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription className="text-sm mb-4 line-clamp-2">
          {course.description}
        </CardDescription>

        {/* Course Meta Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Play className="w-4 h-4" />
            <span>{Array.isArray(course.content) ? course.content.length : 0} Lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(course.duration_hours)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>2.4k</span>
          </div>
        </div>

        {/* Progress Bar for Enrolled Courses */}
        {showProgress && progress && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress.completion_percentage)}% complete
              </span>
            </div>
            <Progress value={progress.completion_percentage} className="h-2" />
            {progress.last_accessed_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last studied: {new Date(progress.last_accessed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
            {course.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{course.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Action Section */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {isProOnly ? (
              <>
                <span className="text-lg font-bold text-purple-600 flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  Pro Access
                </span>
                <span className="text-xs text-muted-foreground">
                  {displayPrice > 0
                    ? `One-time unlock ${formatCurrency(displayPrice)}`
                    : 'Included with Pro membership'}
                </span>
              </>
            ) : displayPrice > 0 ? (
              <>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(displayPrice)}
                </span>
                <span className="text-xs text-muted-foreground">One-time payment</span>
              </>
            ) : (
              <span className="text-lg font-bold text-green-600">
                Free
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {isCompleted && (
              <Button variant="outline" size="sm">
                <Award className="w-4 h-4 mr-1" />
                Certificate
              </Button>
            )}
            
            {isEnrolled ? (
              <Button
                onClick={() => onContinue?.(course.id)}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                {actionLabel}
              </Button>
            ) : (
              <Button
                onClick={() => onEnroll?.(course.id)}
                variant={!isProOnly && displayPrice === 0 ? "outline" : "default"}
                className={!isProOnly && displayPrice === 0
                  ? ""
                  : "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                }
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}