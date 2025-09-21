import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Plus, Edit, Trash2, Save, X, Bot } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  content: any;
  instructor_id: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  type: 'quiz';
  content: string;
  quiz: {
    questions: Question[];
    passingScore: number;
  };
}

export const AdminQuizManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizContent, setQuizContent] = useState('');
  const [passingScore, setPassingScore] = useState(75);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setQuizTitle('');
    setQuizContent('');
    setPassingScore(75);
    setQuestions([]);
    setEditingQuiz(null);
  };

  const openQuizDialog = (quiz?: Quiz) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setQuizTitle(quiz.title);
      setQuizContent(quiz.content);
      setPassingScore(quiz.quiz.passingScore);
      setQuestions(quiz.quiz.questions);
    } else {
      resetForm();
    }
    setIsQuizDialogOpen(true);
  };

  const closeQuizDialog = () => {
    setIsQuizDialogOpen(false);
    resetForm();
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const generateQuizWithAI = async () => {
    if (!selectedCourse) {
      toast({
        title: "Error",
        description: "Please select a course first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Extract course content for context
      const courseContent = Array.isArray(selectedCourse.content) 
        ? selectedCourse.content 
        : selectedCourse.content?.lessons || [];
      
      const contentText = courseContent
        .filter((lesson: any) => lesson.type !== 'quiz')
        .map((lesson: any) => `${lesson.title}: ${lesson.content}`)
        .join('\n\n');

      const prompt = `Create a comprehensive quiz based on this course content:

Course: ${selectedCourse.title}
Content: ${contentText.substring(0, 2000)}...

Generate 5 multiple-choice questions that test understanding of key concepts. For each question, provide:
1. A clear, specific question
2. 4 answer options (A, B, C, D)
3. The correct answer (0-3 index)
4. A brief explanation of why the answer is correct

Format as JSON with this structure:
{
  "title": "Quiz Title",
  "content": "Brief quiz introduction",
  "questions": [
    {
      "id": "unique_id",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}`;

      const response = await supabase.functions.invoke('generate-lyrics', {
        body: { 
          prompt,
          type: 'quiz_generation'
        }
      });

      if (response.error) throw response.error;

      const generatedQuiz = response.data.content;
      
      // Try to parse the AI response as JSON
      let quizData;
      try {
        quizData = JSON.parse(generatedQuiz);
      } catch {
        // If JSON parsing fails, create a default structure
        quizData = {
          title: `${selectedCourse.title} Quiz`,
          content: 'Test your knowledge of the course material.',
          questions: []
        };
      }

      setQuizTitle(quizData.title || `${selectedCourse.title} Quiz`);
      setQuizContent(quizData.content || 'Test your knowledge of the course material.');
      
      if (quizData.questions && Array.isArray(quizData.questions)) {
        const formattedQuestions = quizData.questions.map((q: any, index: number) => ({
          id: q.id || `q_${Date.now()}_${index}`,
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || ''
        }));
        setQuestions(formattedQuestions);
      }

      toast({
        title: "Quiz Generated!",
        description: "AI has generated quiz questions. Please review and edit as needed.",
      });

    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate quiz with AI. Please create manually.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveQuiz = async () => {
    if (!selectedCourse || !quizTitle.trim() || questions.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one question",
        variant: "destructive"
      });
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter(q => 
      !q.question.trim() || 
      q.options.some(opt => !opt.trim()) ||
      q.correctAnswer < 0 || 
      q.correctAnswer >= q.options.length
    );

    if (invalidQuestions.length > 0) {
      toast({
        title: "Error",
        description: "Please complete all questions and ensure they have valid options and correct answers",
        variant: "destructive"
      });
      return;
    }

    try {
      const quiz: Quiz = {
        id: editingQuiz?.id || `quiz_${Date.now()}`,
        title: quizTitle,
        type: 'quiz',
        content: quizContent,
        quiz: {
          questions,
          passingScore
        }
      };

      // Get current course content
      const currentContent = Array.isArray(selectedCourse.content) 
        ? selectedCourse.content 
        : selectedCourse.content?.lessons || [];

      let updatedContent;
      if (editingQuiz) {
        // Update existing quiz
        updatedContent = currentContent.map((item: any) => 
          item.id === editingQuiz.id ? quiz : item
        );
      } else {
        // Add new quiz
        updatedContent = [...currentContent, quiz];
      }

      const { error } = await supabase
        .from('courses')
        .update({ content: updatedContent })
        .eq('id', selectedCourse.id);

      if (error) throw error;

      // Update local state
      setSelectedCourse({ ...selectedCourse, content: updatedContent });
      setCourses(courses.map(c => 
        c.id === selectedCourse.id 
          ? { ...c, content: updatedContent }
          : c
      ));

      toast({
        title: "Success",
        description: `Quiz ${editingQuiz ? 'updated' : 'created'} successfully`,
      });

      closeQuizDialog();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz",
        variant: "destructive"
      });
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!selectedCourse) return;

    try {
      const currentContent = Array.isArray(selectedCourse.content) 
        ? selectedCourse.content 
        : selectedCourse.content?.lessons || [];

      const updatedContent = currentContent.filter((item: any) => item.id !== quizId);

      const { error } = await supabase
        .from('courses')
        .update({ content: updatedContent })
        .eq('id', selectedCourse.id);

      if (error) throw error;

      // Update local state
      setSelectedCourse({ ...selectedCourse, content: updatedContent });
      setCourses(courses.map(c => 
        c.id === selectedCourse.id 
          ? { ...c, content: updatedContent }
          : c
      ));

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive"
      });
    }
  };

  const getQuizzes = (course: Course): Quiz[] => {
    const content = Array.isArray(course.content) 
      ? course.content 
      : course.content?.lessons || [];
    return content.filter((item: any) => item.type === 'quiz');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quiz Manager</h2>
          <p className="text-muted-foreground">Create and manage quizzes for your courses</p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse?.id || ''} onValueChange={(value) => {
            const course = courses.find(c => c.id === value) || null;
            setSelectedCourse(course);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course to manage quizzes" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Quizzes List */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quizzes for {selectedCourse.title}</CardTitle>
              <Button onClick={() => openQuizDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Quiz
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getQuizzes(selectedCourse).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {quiz.quiz.questions.length} questions • {quiz.quiz.passingScore}% passing score
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Quiz
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openQuizDialog(quiz)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteQuiz(quiz.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {getQuizzes(selectedCourse).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>No quizzes created yet</p>
                  <p className="text-sm">Click "Add Quiz" to create your first quiz</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Creation/Edit Dialog */}
      <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quiz Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Enter quiz title"
                />
              </div>
              <div>
                <Label htmlFor="passing-score">Passing Score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quiz-content">Quiz Introduction</Label>
              <Textarea
                id="quiz-content"
                value={quizContent}
                onChange={(e) => setQuizContent(e.target.value)}
                placeholder="Enter quiz introduction or instructions"
                rows={3}
              />
            </div>

            {/* AI Generation */}
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-card/50">
              <Bot className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">AI Quiz Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate quiz questions automatically based on course content
                </p>
              </div>
              <Button 
                onClick={generateQuizWithAI}
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Questions ({questions.length})</Label>
                <Button onClick={addQuestion} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-6">
                {questions.map((question, questionIndex) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Label>Question {questionIndex + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(questionIndex)}
                          className="text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                        placeholder="Enter your question"
                        rows={2}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${questionIndex}`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => updateQuestion(questionIndex, 'correctAnswer', optionIndex)}
                              className="text-primary"
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateQuestionOption(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label>Explanation (optional)</Label>
                        <Textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                          placeholder="Explain why this answer is correct"
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                {questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>No questions added yet</p>
                    <p className="text-sm">Click "Add Question" or "Generate with AI" to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={closeQuizDialog}>
                Cancel
              </Button>
              <Button onClick={saveQuiz}>
                <Save className="w-4 h-4 mr-2" />
                {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuizManager;