import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  Video, 
  Headphones,
  Download,
  Award,
  X,
  HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateCourseCertificatePdf } from '@/utils/certificates';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  content: any;
  thumbnail_url?: string;
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
  type: 'text' | 'video' | 'audio' | 'quiz' | 'markdown';
  content: string;
  duration?: number;
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
  quiz?: {
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
    passingScore?: number;
  };
}

interface CourseViewerProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  progress?: any;
  onProgressUpdated?: () => void;
}

interface CourseCertificate {
  id: string;
  certificate_data: {
    course_title?: string;
    user_name?: string;
    completion_date?: string;
    [key: string]: any;
  };
  certificate_url?: string | null;
}

export const EnhancedCourseViewer: React.FC<CourseViewerProps> = ({
  course,
  isOpen,
  onClose,
  progress,
  onProgressUpdated
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: string]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('lesson');
  const [resources, setResources] = useState<Array<{ name: string; url: string }>>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificateDetails, setCertificateDetails] = useState<CourseCertificate | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (course && isOpen) {
      setCurrentLessonIndex(0);
      const completed = progress?.progress_data?.completed_lessons || progress?.completedLessons || [];
      setCompletedLessons(completed);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      setCertificateId(null);
      setCertificateDetails(null);
    }
  }, [course, isOpen, progress]);

  useEffect(() => {
    // Reset quiz state when changing lessons
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  }, [currentLessonIndex]);

  useEffect(() => {
    const loadCertificate = async () => {
      if (!course || !user || progress?.completion_percentage !== 100) return;

      try {
        const { data, error } = await supabase
          .from('course_certificates')
          .select('id, certificate_data, certificate_url')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setCertificateId(data.id);
          setCertificateDetails(data as CourseCertificate);
        }
      } catch (certificateError) {
        console.error('Error loading certificate details:', certificateError);
      }
    };

    loadCertificate();
  }, [course?.id, progress?.completion_percentage, user?.id]);

  useEffect(() => {
    const loadResources = async () => {
      if (!course) return;
      try {
        setResourcesLoading(true);
        const prefix = `${course.id}/`;
        const { data, error } = await supabase.storage
          .from('course-materials')
          .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw error;
        const files = data || [];
        const items: Array<{ name: string; url: string }> = [];
        for (const f of files) {
          const path = `${prefix}${f.name}`;
          const { data: signed, error: signErr } = await supabase.storage
            .from('course-materials')
            .createSignedUrl(path, 3600);
          if (!signErr && signed?.signedUrl) {
            items.push({ name: f.name, url: signed.signedUrl });
          }
        }
        setResources(items);
      } catch (e) {
        console.error('Error loading resources:', e);
      } finally {
        setResourcesLoading(false);
      }
    };
    if (activeTab === 'resources' && resources.length === 0) {
      loadResources();
    }
  }, [activeTab, course]);

  const markLessonComplete = async (lessonId: string) => {
    if (!course || !user) {
      toast({ title: "Sign in required", description: "Please sign in to save progress.", variant: "destructive" });
      return;
    }
    if (completedLessons.includes(lessonId)) return;

    const newCompleted = Array.from(new Set([...completedLessons, lessonId]));
    setCompletedLessons(newCompleted);

    const totalLessons = Array.isArray(course.content) ? course.content.length : (course.content?.lessons?.length || 0);
    const newProgressPercentage = totalLessons > 0 ? (newCompleted.length / totalLessons) * 100 : 0;

    try {
      const { error } = await supabase
        .from('user_course_progress')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress_data: { completed_lessons: newCompleted },
          completion_percentage: Math.round(newProgressPercentage),
          completed_at: Math.round(newProgressPercentage) === 100 ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString()
        }, { onConflict: 'user_id,course_id' });

      if (error) throw error;

      if (Math.round(newProgressPercentage) === 100) {
        const { data: certData, error: certError } = await supabase.rpc('generate_course_certificate', {
          p_course_id: course.id,
          p_user_id: user.id
        });
        if (!certError && certData) {
          setCertificateId(certData as string);
          const { data: certificateRecord } = await supabase
            .from('course_certificates')
            .select('id, certificate_data, certificate_url')
            .eq('id', certData as string)
            .maybeSingle();
          if (certificateRecord) {
            setCertificateDetails(certificateRecord as CourseCertificate);
          }
        }
      }

      toast({
        title: "Progress Saved",
        description: "Lesson marked as complete",
      });

      onProgressUpdated?.();
    } catch (err) {
      console.error('Error updating progress:', err);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Headphones className="w-4 h-4" />;
      case 'quiz': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleDownloadCertificate = () => {
    if (!certificateDetails) return;

    const certificateData = certificateDetails.certificate_data || {};
    generateCourseCertificatePdf({
      courseTitle: certificateData.course_title || course?.title || 'Course',
      userName: certificateData.user_name || user?.user_metadata?.full_name || 'Student',
      completionDate: certificateData.completion_date || new Date().toISOString(),
      certificateId: certificateDetails.id
    });
  };

  const handleQuizAnswer = (questionId: string, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const submitQuiz = async (lesson: Lesson) => {
    if (!lesson.quiz) return;
    
    let correctAnswers = 0;
    lesson.quiz.questions.forEach(question => {
      if (quizAnswers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const score = (correctAnswers / lesson.quiz.questions.length) * 100;
    setQuizScore(score);
    setQuizSubmitted(true);
    
    // Persist quiz attempt
    try {
      if (user && course) {
        await supabase.from('quiz_results').insert({
          course_id: course.id,
          user_id: user.id,
          score: Math.round(score),
          max_score: 100,
          answers: quizAnswers,
          lesson_id: lesson.id
        });
      }
    } catch (e) {
      console.error('Error saving quiz result:', e);
    }
    
    const passingScore = lesson.quiz.passingScore || 70;
    if (score >= passingScore) {
      await markLessonComplete(lesson.id);
      toast({
        title: "Quiz passed!",
        description: `Great job! You scored ${Math.round(score)}%`,
      });
    } else {
      toast({
        title: "Quiz not passed",
        description: `You scored ${Math.round(score)}%. You need ${passingScore}% to pass.`,
        variant: "destructive"
      });
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const renderQuizContent = (lesson: Lesson) => {
    if (!lesson.quiz) return null;

    return (
      <div className="space-y-6">
        {/* Quiz Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quiz Instructions</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Answer all questions below. You need {lesson.quiz.passingScore || 70}% to pass this quiz.
          </p>
          {quizSubmitted && quizScore !== null && (
            <div className={`mt-3 p-3 rounded ${
              quizScore >= (lesson.quiz.passingScore || 70) 
                ? 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200' 
                : 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200'
            }`}>
              <p className="font-medium">
                Quiz {quizScore >= (lesson.quiz.passingScore || 70) ? 'Passed' : 'Failed'}: {Math.round(quizScore)}%
              </p>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {lesson.quiz.questions.map((question, questionIndex) => (
            <Card key={question.id} className="p-6">
              <div className="space-y-4">
                <h4 className="font-medium text-lg">
                  {questionIndex + 1}. {question.question}
                </h4>
                
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = quizAnswers[question.id] === optionIndex;
                    const isCorrect = optionIndex === question.correctAnswer;
                    const showResults = quizSubmitted;
                    
                    let optionClass = "p-4 border rounded-lg cursor-pointer transition-all ";
                    
                    if (showResults) {
                      if (isCorrect) {
                        optionClass += "bg-green-100 dark:bg-green-950/20 border-green-500 text-green-800 dark:text-green-200";
                      } else if (isSelected && !isCorrect) {
                        optionClass += "bg-red-100 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-200";
                      } else {
                        optionClass += "bg-muted/50 border-muted";
                      }
                    } else {
                      if (isSelected) {
                        optionClass += "bg-primary/10 border-primary text-primary";
                      } else {
                        optionClass += "bg-background border-border hover:bg-muted/50";
                      }
                    }
                    
                    return (
                      <div
                        key={optionIndex}
                        className={optionClass}
                        onClick={() => !quizSubmitted && handleQuizAnswer(question.id, optionIndex)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected && !showResults ? 'border-primary bg-primary' :
                            showResults && isCorrect ? 'border-green-500 bg-green-500' :
                            showResults && isSelected && !isCorrect ? 'border-red-500 bg-red-500' :
                            'border-muted-foreground'
                          }`}>
                            {(isSelected || (showResults && isCorrect)) && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show explanation after submission */}
                {quizSubmitted && question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Quiz Actions */}
        <div className="flex justify-center gap-4 pt-6">
          {!quizSubmitted ? (
            <Button
              onClick={() => submitQuiz(lesson)}
              disabled={Object.keys(quizAnswers).length !== lesson.quiz!.questions.length}
              className="px-8 py-2"
            >
              Submit Quiz
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={resetQuiz}
                variant="outline"
                className="px-8 py-2"
              >
                Retake Quiz
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLessonContent = (lesson: Lesson) => {
    if (!lesson) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No lesson content available.</p>
        </div>
      );
    }

    switch (lesson.type) {
      case 'quiz': {
        // Parse quiz content from JSON
        let quizData = null;
        try {
          quizData = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
        } catch (error) {
          console.error('Error parsing quiz content:', error);
          return (
            <div className="text-center py-8 text-red-600">
              <p>Error loading quiz content: {error.message}</p>
              <pre className="mt-4 text-xs bg-gray-100 p-4 rounded">{lesson.content}</pre>
            </div>
          );
        }
        
        if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
          return (
            <div className="text-center py-8 text-red-600">
              <p>Invalid quiz data structure</p>
              <pre className="mt-4 text-xs bg-gray-100 p-4 rounded">{JSON.stringify(quizData, null, 2)}</pre>
            </div>
          );
        }
        
        // Create a temporary lesson object with quiz data for compatibility
        const quizLesson = { ...lesson, quiz: quizData };
        return renderQuizContent(quizLesson);
      }
      case 'text':
      case 'markdown':
        return (
          <div className="space-y-4">
            {lesson.audioUrl && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Audio narration available</span>
                </div>
                <audio 
                  controls 
                  className="w-full" 
                  preload="metadata"
                  onError={(e) => {
                    console.error('Audio error:', e);
                    console.error('Audio error details:', e.currentTarget.error);
                  }}
                  onLoadStart={() => console.log('Audio load started')}
                  onCanPlay={() => console.log('Audio can play')}
                  onLoadedData={() => console.log('Audio data loaded')}
                >
                  <source src={lesson.audioUrl} type="audio/mpeg" />
                  <source src={lesson.audioUrl} type="audio/mp4" />
                  <source src={lesson.audioUrl} type="audio/wav" />
                  <source src={lesson.audioUrl} type="audio/ogg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-4">
            {lesson.videoUrl && (
              <video controls className="w-full rounded-lg">
                <source src={lesson.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
            {lesson.audioUrl && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Additional audio narration</span>
                </div>
                <audio controls className="w-full">
                  <source src={lesson.audioUrl} type="audio/mpeg" />
                  <source src={lesson.audioUrl} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-4">
            {lesson.audioUrl && (
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Audio lesson</span>
                </div>
                <audio controls className="w-full">
                  <source src={lesson.audioUrl} type="audio/mpeg" />
                  <source src={lesson.audioUrl} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            {lesson.audioUrl && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Audio narration available</span>
                </div>
                <audio controls className="w-full">
                  <source src={lesson.audioUrl} type="audio/mpeg" />
                  <source src={lesson.audioUrl} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          </div>
        );
    }
  };

  if (!isOpen || !course) return null;

  // Handle the case where course.content might be an array or JSON object
  const lessons = Array.isArray(course.content) ? course.content : course.content?.lessons || [];
  const currentLesson = lessons[currentLessonIndex];
  const progressPercentage = lessons.length > 0 ? (completedLessons.length / lessons.length) * 100 : 0;

  // Separate lessons into content and quizzes
  const contentLessons = lessons.filter((lesson: any) => lesson.type !== 'quiz');
  const quizLessons = lessons.filter((lesson: any) => lesson.type === 'quiz');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">{course.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Course Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lesson" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Lesson
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Quiz
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Progress
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            
            {/* Lesson Tab */}
            <TabsContent value="lesson" className="h-full m-0">
              <div className="flex h-full">
                {/* Sidebar - Content Lessons List */}
                <div className="w-80 border-r bg-card/30 flex flex-col">
                  <div className="flex-shrink-0 p-4 border-b">
                    <h3 className="font-semibold text-sm mb-4">Course Content</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{Math.round(progressPercentage)}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {completedLessons.length} of {lessons.length} lessons completed
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-2">
                      {contentLessons.map((lesson: any, index: number) => {
                        const globalIndex = lessons.findIndex((l: any) => l.id === lesson.id);
                        const isCompleted = completedLessons.includes(lesson.id);
                        const isCurrent = globalIndex === currentLessonIndex;
                        
                        return (
                          <Card
                            key={lesson.id || index}
                            className={`mb-2 cursor-pointer transition-all ${
                              isCurrent ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setCurrentLessonIndex(globalIndex)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : isCurrent 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isCompleted ? <CheckCircle className="w-3 h-3" /> : index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{lesson.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {getLessonIcon(lesson.type || 'text')}
                                    <span>{lesson.type || 'text'}</span>
                                    {lesson.duration && (
                                      <>
                                        <span>•</span>
                                        <span>{lesson.duration}m</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                  {currentLesson ? (
                    <>
                      <div className="flex-shrink-0 p-6 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                              {getLessonIcon(currentLesson.type || 'text')}
                              <span className="capitalize">{currentLesson.type || 'text'} {currentLesson.type === 'quiz' ? '' : 'Lesson'}</span>
                              {currentLesson.duration && (
                                <>
                                  <span>•</span>
                                  <span>{currentLesson.duration} minutes</span>
                                </>
                              )}
                            </div>
                          </div>
                          {currentLesson.type !== 'quiz' && (
                            <Button
                              onClick={() => markLessonComplete(currentLesson.id)}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-4xl mx-auto">
                          <div className="bg-card/50 rounded-2xl p-8 shadow-sm border">
                            {renderLessonContent(currentLesson)}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 p-6 border-t bg-card/30">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                            disabled={currentLessonIndex === 0}
                            className="flex items-center gap-2"
                            size="sm"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Lesson {currentLessonIndex + 1} of {lessons.length}
                            </p>
                          </div>

                          <Button
                            onClick={() => setCurrentLessonIndex(Math.min(lessons.length - 1, currentLessonIndex + 1))}
                            disabled={currentLessonIndex === lessons.length - 1}
                            className="flex items-center gap-2"
                            size="sm"
                          >
                            Next
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <p>Select a lesson to view its content</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="h-full m-0">
              <div className="flex h-full">
                <div className="w-80 border-r bg-card/30 flex flex-col">
                  <div className="flex-shrink-0 p-4 border-b">
                    <h3 className="font-semibold text-sm">Available Quizzes</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-2">
                      {quizLessons.length > 0 ? quizLessons.map((quiz: any, index: number) => {
                        const globalIndex = lessons.findIndex((l: any) => l.id === quiz.id);
                        const isCompleted = completedLessons.includes(quiz.id);
                        const isCurrent = globalIndex === currentLessonIndex;
                        
                        return (
                          <Card
                            key={quiz.id || index}
                            className={`mb-2 cursor-pointer transition-all ${
                              isCurrent ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setCurrentLessonIndex(globalIndex)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : isCurrent 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isCompleted ? <CheckCircle className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{quiz.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <HelpCircle className="w-3 h-3" />
                                    <span>Quiz</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <HelpCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No quizzes available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {currentLesson && currentLesson.type === 'quiz' ? (
                    <>
                      <div className="flex-shrink-0 p-6 border-b">
                        <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
                        <p className="text-muted-foreground text-sm mt-1">Complete this quiz to test your knowledge</p>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-4xl mx-auto">
                          <div className="bg-card/50 rounded-2xl p-8 shadow-sm border">
                            {renderLessonContent(currentLesson)}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <HelpCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>Select a quiz to take it</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="h-full m-0 p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Course Progress</h2>
                  <p className="text-muted-foreground">Track your learning journey</p>
                </div>

                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Overall Progress</span>
                      <span className="text-2xl font-bold">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold">{completedLessons.length}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold">{lessons.length - completedLessons.length}</div>
                        <div className="text-sm text-muted-foreground">Remaining</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold">{lessons.length}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {Math.round(progressPercentage) === 100 && (
                  <Card className="p-6 mb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold">Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          {certificateDetails
                            ? 'Download your certificate of completion.'
                            : certificateId
                              ? 'Your certificate has been issued.'
                              : 'Certificate is being generated.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Issued</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadCertificate}
                          disabled={!certificateDetails}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Lessons ({contentLessons.length})</h3>
                    <div className="space-y-2">
                      {contentLessons.map((lesson: any, index: number) => {
                        const isCompleted = completedLessons.includes(lesson.id);
                        return (
                          <div key={lesson.id} className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              isCompleted ? 'bg-green-500' : 'bg-muted'
                            }`}>
                              {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {lesson.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Quizzes ({quizLessons.length})</h3>
                    <div className="space-y-2">
                      {quizLessons.length > 0 ? quizLessons.map((quiz: any) => {
                        const isCompleted = completedLessons.includes(quiz.id);
                        return (
                          <div key={quiz.id} className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              isCompleted ? 'bg-green-500' : 'bg-muted'
                            }`}>
                              {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {quiz.title}
                            </span>
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground">No quizzes available</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="h-full m-0 p-8">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Course Resources</h2>
                  <p className="text-muted-foreground">Download course materials for offline study</p>
                </div>
                {/* Resources content will be imported here */}
                <div className="bg-card/50 rounded-2xl p-8 shadow-sm border">
                  {resourcesLoading ? (
                    <p className="text-center text-muted-foreground">Loading resources...</p>
                  ) : resources.length > 0 ? (
                    <ul className="space-y-3">
                      {resources.map((r) => (
                        <li key={r.name} className="flex items-center justify-between border rounded-lg p-3">
                          <span className="text-sm">{r.name}</span>
                          <a href={r.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground">No resources available.</p>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCourseViewer;