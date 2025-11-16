import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { 
  Plus, 
  Edit3, 
  Save, 
  Eye, 
  Trash2, 
  Type, 
  Video, 
  FileText, 
  HelpCircle, 
  Upload, 
  Play, 
  Pause,
  GripVertical,
  Settings,
  BookOpen,
  Users,
  Clock,
  Target,
  CheckCircle,
  Sparkles,
  Layers,
  Copy,
  ArrowLeft,
  ArrowRight,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  Brain,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Globe,
  RefreshCw,
  Image,
  Mic,
  Camera,
  StopCircle,
  Wand2,
  Code,
  Gamepad2,
  FileVideo,
  FileAudio,
  FileImage,
  ExternalLink,
  Info,
  Lightbulb,
  Rocket,
  Headphones,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  Minus,
  UserPlus,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Quote,
  Link,
  Hash,
  ImageIcon,
  Palette,
  Monitor as CodeIcon,
  PlayCircle,
  Download,
  FileDown,
  Youtube,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { toast } from 'sonner@2.0.3';

// Clean interfaces without mock data
interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'audio' | 'image' | 'quiz' | 'interactive' | 'assignment' | 'discussion' | 'file' | 'embed' | 'callout' | 'code';
  title: string;
  content: any;
  settings: {
    required?: boolean;
    timeLimit?: number;
    points?: number;
    allowComments?: boolean;
  };
  metadata: {
    createdAt: string;
    modifiedAt: string;
    version: number;
  };
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  blocks: ContentBlock[];
  isPublished: boolean;
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  isPublished: boolean;
  order: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modules: Module[];
  settings: {
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    category: string;
    language: string;
    isPublic: boolean;
    price: number;
  };
}

interface AIPrompt {
  type: 'outline' | 'content' | 'quiz' | 'lesson';
  context: string;
  requirements: string;
  targetAudience: string;
}

interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'document';
  url: string;
  size: number;
  uploadedAt: string;
}

// Block type definitions
const blockTypes = [
  { type: 'text', label: 'Rich Text', icon: Type, description: 'Text content with formatting' },
  { type: 'video', label: 'Video', icon: Video, description: 'Video lessons and recordings' },
  { type: 'audio', label: 'Audio', icon: Headphones, description: 'Audio content and podcasts' },
  { type: 'image', label: 'Image', icon: Image, description: 'Images and visual content' },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Interactive assessments' },
  { type: 'interactive', label: 'Interactive', icon: Zap, description: 'Hands-on exercises' },
  { type: 'assignment', label: 'Assignment', icon: Target, description: 'Projects and homework' },
  { type: 'discussion', label: 'Discussion', icon: MessageSquare, description: 'Student discussions' },
  { type: 'file', label: 'File', icon: FileText, description: 'Downloadable resources' },
  { type: 'embed', label: 'Embed', icon: ExternalLink, description: 'External content' },
  { type: 'callout', label: 'Callout', icon: Info, description: 'Important notes' },
  { type: 'code', label: 'Code', icon: Code, description: 'Code examples' }
];

interface ContentCreatorProps {
  templateData?: any;
}

export function ContentCreator({ templateData }: ContentCreatorProps = {}) {
  // Core course state - starts completely empty
  const [course, setCourse] = useState<Course>({
    id: `course-${Date.now()}`,
    title: '',
    description: '',
    thumbnail: '',
    modules: [],
    settings: {
      difficulty: 'Beginner',
      category: '',
      language: 'English',
      isPublic: false,
      price: 0
    }
  });

  // UI state
  const [currentStep, setCurrentStep] = useState<'setup' | 'structure' | 'content' | 'publish'>('setup');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Modal states
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);

  // Clean state without mock data
  const [aiPrompt, setAiPrompt] = useState<AIPrompt>({
    type: 'outline',
    context: '',
    requirements: '',
    targetAudience: 'Beginners'
  });
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'screen' | 'camera' | 'audio'>('screen');
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize course from template if provided
  useEffect(() => {
    if (templateData?.template) {
      const template = templateData.template;
      const templateCourse: Course = {
        id: `course-${Date.now()}`,
        title: template.title + ' (From Template)',
        description: template.description,
        thumbnail: '',
        modules: template.preview.modules.map((moduleData: any, moduleIndex: number) => ({
          id: `module-${Date.now()}-${moduleIndex}`,
          title: moduleData.title,
          description: `Module covering ${moduleData.title}`,
          isPublished: false,
          order: moduleIndex,
          lessons: moduleData.lessons.map((lessonTitle: string, lessonIndex: number) => ({
            id: `lesson-${Date.now()}-${moduleIndex}-${lessonIndex}`,
            title: lessonTitle,
            description: `Learn about ${lessonTitle}`,
            duration: '20 min',
            isPublished: false,
            order: lessonIndex,
            blocks: []
          }))
        })),
        settings: {
          difficulty: template.difficulty,
          category: template.category,
          language: 'English',
          isPublic: false,
          price: template.price === 'Premium' ? 49.99 : 0
        }
      };
      
      setCourse(templateCourse);
      setCurrentStep('structure');
      
      toast.success(`🎯 Template "${template.title}" loaded!`, {
        description: 'Course structure created. Add your content to each lesson.',
        duration: 4000
      });
    }
  }, [templateData]);

  // Auto-save functionality
  useEffect(() => {
    if (course.title || course.description || course.modules.length > 0) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        setSaveStatus('saved');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [course]);

  // AI-powered content generation
  const generateWithAI = async () => {
    if (!aiPrompt.context.trim()) {
      toast.error('Please provide context for AI generation');
      return;
    }

    toast.info('🤖 AI is generating content...', { duration: 2000 });

    // Simulate AI generation
    setTimeout(() => {
      switch (aiPrompt.type) {
        case 'outline':
          const aiModule: Module = {
            id: `ai-module-${Date.now()}`,
            title: aiPrompt.context,
            description: `Module covering ${aiPrompt.context} for ${aiPrompt.targetAudience.toLowerCase()}.`,
            isPublished: false,
            order: course.modules.length,
            lessons: [
              {
                id: `ai-lesson-1-${Date.now()}`,
                title: 'Introduction and Fundamentals',
                description: 'Core concepts and getting started',
                duration: '20 min',
                isPublished: false,
                order: 0,
                blocks: []
              },
              {
                id: `ai-lesson-2-${Date.now()}`,
                title: 'Practical Applications',
                description: 'Hands-on exercises and real-world examples',
                duration: '30 min',
                isPublished: false,
                order: 1,
                blocks: []
              }
            ]
          };
          setCourse(prev => ({ ...prev, modules: [...prev.modules, aiModule] }));
          toast.success('🎉 AI generated a module outline!', { duration: 4000 });
          break;

        case 'content':
          if (selectedBlock) {
            const aiContent = {
              text: `# ${aiPrompt.context}\n\n${aiPrompt.requirements ? `${aiPrompt.requirements}\n\n` : ''}This content is generated based on your specifications for ${aiPrompt.targetAudience.toLowerCase()}.\n\nAdd your specific content here and customize as needed.`
            };
            updateBlock(selectedBlock, { content: aiContent });
            toast.success('✨ AI generated content for your block!', { duration: 3000 });
          }
          break;

        case 'quiz':
          if (selectedBlock) {
            const aiQuiz = {
              questions: [
                {
                  id: 1,
                  question: `Enter your question about ${aiPrompt.context}`,
                  type: 'multiple-choice',
                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                  correct: 0,
                  explanation: 'Add explanation here'
                }
              ]
            };
            updateBlock(selectedBlock, { content: aiQuiz });
            toast.success('🧠 AI created a quiz template!', { duration: 3000 });
          }
          break;

        case 'lesson':
          if (selectedModule) {
            const aiLesson: Lesson = {
              id: `ai-lesson-${Date.now()}`,
              title: aiPrompt.context,
              description: aiPrompt.requirements || 'AI-generated lesson',
              duration: '15 min',
              isPublished: false,
              order: getCurrentModule()?.lessons.length || 0,
              blocks: []
            };
            setCourse(prev => ({
              ...prev,
              modules: prev.modules.map(module => 
                module.id === selectedModule
                  ? { ...module, lessons: [...module.lessons, aiLesson] }
                  : module
              )
            }));
            setSelectedLesson(aiLesson.id);
            toast.success('📚 AI generated a lesson!', { duration: 3000 });
          }
          break;
      }
      setShowAIDialog(false);
      // Reset AI prompt
      setAiPrompt({
        type: 'outline',
        context: '',
        requirements: '',
        targetAudience: 'Beginners'
      });
    }, 3000);
  };

  // Media recording functions
  const startRecording = async () => {
    try {
      let stream: MediaStream;
      
      switch (recordingType) {
        case 'screen':
          stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { width: 1920, height: 1080 }, 
            audio: true 
          });
          break;
        case 'camera':
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 }, 
            audio: true 
          });
          break;
        case 'audio':
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        default:
          return;
      }

      if (videoRef.current && recordingType !== 'audio') {
        videoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recordingType === 'audio' ? 'audio/webm' : 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const newFile: MediaFile = {
          id: `media-${Date.now()}`,
          name: `${recordingType}-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
          type: recordingType === 'audio' ? 'audio' : 'video',
          url,
          size: blob.size,
          uploadedAt: new Date().toISOString()
        };
        
        setMediaFiles(prev => [newFile, ...prev]);
        toast.success(`📹 ${recordingType} recording saved!`, { duration: 4000 });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.success(`🔴 ${recordingType} recording started`, { duration: 2000 });
      
    } catch (error) {
      console.error('Recording error:', error);
      toast.error(`❌ Could not start ${recordingType} recording. Please check permissions.`, { duration: 4000 });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
  };

  // File upload handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const mediaFile: MediaFile = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' :
              file.type.startsWith('image/') ? 'image' : 'document',
        url,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
      setMediaFiles(prev => [mediaFile, ...prev]);
    });

    toast.success(`📁 Uploaded ${files.length} file(s)`, { duration: 2000 });
    // Clear file input
    event.target.value = '';
  };

  // Image upload for blocks
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedBlock) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const url = URL.createObjectURL(file);
    const currentBlock = getCurrentBlock();
    
    if (currentBlock?.type === 'image') {
      updateBlock(selectedBlock, {
        content: {
          ...currentBlock.content,
          url,
          alt: file.name.replace(/\.[^/.]+$/, ''),
          caption: ''
        }
      });
      toast.success('Image uploaded successfully!');
    }

    event.target.value = '';
  };

  // Collaboration functions
  const addCollaborator = () => {
    if (!newCollaboratorEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (collaborators.includes(newCollaboratorEmail)) {
      toast.error('Collaborator already added');
      return;
    }

    setCollaborators(prev => [...prev, newCollaboratorEmail]);
    setNewCollaboratorEmail('');
    toast.success(`Invitation sent to ${newCollaboratorEmail}`, { duration: 3000 });
  };

  const removeCollaborator = (email: string) => {
    setCollaborators(prev => prev.filter(c => c !== email));
    toast.success('Collaborator removed');
  };

  // Course management functions
  const addModule = () => {
    const newModule: Module = {
      id: `module-${Date.now()}`,
      title: 'New Module',
      description: '',
      lessons: [],
      isPublished: false,
      order: course.modules.length
    };
    setCourse(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    setSelectedModule(newModule.id);
    toast.success('Module added');
  };

  const addLesson = (moduleId: string) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: 'New Lesson',
      description: '',
      duration: '',
      blocks: [],
      isPublished: false,
      order: 0
    };

    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => 
        module.id === moduleId 
          ? { ...module, lessons: [...module.lessons, { ...newLesson, order: module.lessons.length }] }
          : module
      )
    }));
    setSelectedLesson(newLesson.id);
    toast.success('Lesson added');
  };

  const addBlock = (lessonId: string, blockType: string) => {
    const blockTypeInfo = blockTypes.find(bt => bt.type === blockType);
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: blockType as any,
      title: blockTypeInfo?.label || 'New Block',
      content: getDefaultContent(blockType),
      settings: { 
        required: false, 
        allowComments: true,
        timeLimit: blockType === 'quiz' ? 300 : undefined,
        points: ['quiz', 'assignment'].includes(blockType) ? 10 : undefined
      },
      metadata: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        version: 1
      }
    };

    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson =>
          lesson.id === lessonId
            ? { ...lesson, blocks: [...lesson.blocks, newBlock] }
            : lesson
        )
      }))
    }));
    setSelectedBlock(newBlock.id);
    setShowBlockEditor(true);
    toast.success(`${blockTypeInfo?.label} block added`);
  };

  // Get default content for different block types
  const getDefaultContent = (blockType: string) => {
    switch (blockType) {
      case 'text':
        return { text: '' };
      case 'video':
        return { url: '', transcript: '', chapters: [] };
      case 'audio':
        return { url: '', transcript: '' };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'quiz':
        return { 
          questions: []
        };
      case 'interactive':
        return { type: 'code-editor', content: '', language: 'javascript' };
      case 'assignment':
        return { instructions: '', dueDate: '', points: 100, submissions: [] };
      case 'discussion':
        return { topic: '', description: '', guidelines: [] };
      case 'file':
        return { files: [], description: '' };
      case 'embed':
        return { url: '', type: 'youtube' };
      case 'callout':
        return { type: 'info', title: '', text: '' };
      case 'code':
        return { code: '', language: 'javascript', highlightLines: [] };
      default:
        return {};
    }
  };

  // Update functions
  const updateCourse = (updates: Partial<Course>) => {
    setCourse(prev => ({ ...prev, ...updates }));
    setSaveStatus('unsaved');
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId ? { ...module, ...updates } : module
      )
    }));
    setSaveStatus('unsaved');
  };

  const updateLesson = (lessonId: string, updates: Partial<Lesson>) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson =>
          lesson.id === lessonId ? { ...lesson, ...updates } : lesson
        )
      }))
    }));
    setSaveStatus('unsaved');
  };

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          blocks: lesson.blocks.map(block =>
            block.id === blockId ? { 
              ...block, 
              ...updates,
              metadata: { ...block.metadata, modifiedAt: new Date().toISOString(), version: block.metadata.version + 1 }
            } : block
          )
        }))
      }))
    }));
    setSaveStatus('unsaved');
  };

  // Delete functions
  const deleteModule = (moduleId: string) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.filter(module => module.id !== moduleId)
    }));
    if (selectedModule === moduleId) setSelectedModule(null);
    toast.success('Module deleted');
  };

  const deleteLesson = (lessonId: string) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        lessons: module.lessons.filter(lesson => lesson.id !== lessonId)
      }))
    }));
    if (selectedLesson === lessonId) setSelectedLesson(null);
    toast.success('Lesson deleted');
  };

  const deleteBlock = (blockId: string) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          blocks: lesson.blocks.filter(block => block.id !== blockId)
        }))
      }))
    }));
    if (selectedBlock === blockId) setSelectedBlock(null);
    toast.success('Block deleted');
  };

  // Publish course
  const publishCourse = () => {
    if (!course.title.trim()) {
      toast.error('Please add a course title');
      return;
    }
    if (course.modules.length === 0) {
      toast.error('Please add at least one module');
      return;
    }

    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => ({
        ...module,
        isPublished: true,
        lessons: module.lessons.map(lesson => ({ ...lesson, isPublished: true }))
      }))
    }));

    toast.success('🚀 Course published successfully!', { 
      duration: 6000,
      description: 'Your course is now ready for students'
    });
    setCurrentStep('publish');
  };

  // Helper functions
  const getCurrentModule = () => course.modules.find(m => m.id === selectedModule);
  const getCurrentLesson = () => {
    const module = getCurrentModule();
    return module?.lessons.find(l => l.id === selectedLesson);
  };
  const getCurrentBlock = () => {
    const lesson = getCurrentLesson();
    return lesson?.blocks.find(b => b.id === selectedBlock);
  };

  const getTotalLessons = () => course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
  const getTotalBlocks = () => course.modules.reduce((acc, module) => 
    acc + module.lessons.reduce((lacc, lesson) => lacc + lesson.blocks.length, 0), 0
  );

  // Block content has data check
  const blockHasContent = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return block.content?.text?.trim();
      case 'video':
      case 'audio':
        return block.content?.url?.trim();
      case 'image':
        return block.content?.url?.trim();
      case 'quiz':
        return block.content?.questions?.length > 0;
      case 'interactive':
        return block.content?.content?.trim();
      case 'assignment':
        return block.content?.instructions?.trim();
      case 'discussion':
        return block.content?.topic?.trim();
      case 'file':
        return block.content?.files?.length > 0;
      case 'embed':
        return block.content?.url?.trim();
      case 'callout':
        return block.content?.text?.trim();
      case 'code':
        return block.content?.code?.trim();
      default:
        return false;
    }
  };

  // Render block-specific editors
  const renderBlockEditor = () => {
    const currentBlock = getCurrentBlock();
    if (!currentBlock) return null;

    switch (currentBlock.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label>Rich Text Content</Label>
              <Textarea
                value={currentBlock.content?.text || ''}
                onChange={(e) => updateBlock(selectedBlock!, { 
                  content: { ...currentBlock.content, text: e.target.value } 
                })}
                placeholder="Start writing your content here. You can use markdown formatting..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports markdown formatting: **bold**, *italic*, # headings, - lists, etc.
              </p>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label>Image Upload</Label>
              <div className="space-y-4">
                {currentBlock.content?.url ? (
                  <div className="space-y-3">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <img 
                        src={currentBlock.content.url} 
                        alt={currentBlock.content.alt || 'Uploaded image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace Image
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">Upload an Image</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click to browse or drag and drop an image file
                    </p>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </Button>
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div>
              <Label>Alt Text (for accessibility)</Label>
              <Input
                value={currentBlock.content?.alt || ''}
                onChange={(e) => updateBlock(selectedBlock!, { 
                  content: { ...currentBlock.content, alt: e.target.value } 
                })}
                placeholder="Describe what's in the image..."
              />
            </div>
            <div>
              <Label>Caption (optional)</Label>
              <Input
                value={currentBlock.content?.caption || ''}
                onChange={(e) => updateBlock(selectedBlock!, { 
                  content: { ...currentBlock.content, caption: e.target.value } 
                })}
                placeholder="Add a caption for the image..."
              />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <Label>Video Source</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={currentBlock.content?.url || ''}
                    onChange={(e) => updateBlock(selectedBlock!, { 
                      content: { ...currentBlock.content, url: e.target.value } 
                    })}
                    placeholder="Enter video URL or upload a file..."
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => setShowMediaDialog(true)}>
                    <Video className="h-4 w-4 mr-2" />
                    Media Library
                  </Button>
                </div>
                {currentBlock.content?.url && (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <PlayCircle className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Video Transcript (optional)</Label>
              <Textarea
                value={currentBlock.content?.transcript || ''}
                onChange={(e) => updateBlock(selectedBlock!, { 
                  content: { ...currentBlock.content, transcript: e.target.value } 
                })}
                placeholder="Add video transcript for accessibility..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label>Quiz Questions</Label>
              <Button 
                onClick={() => {
                  const newQuestion = {
                    id: Date.now(),
                    question: '',
                    type: 'multiple-choice',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct: 0,
                    explanation: ''
                  };
                  updateBlock(selectedBlock!, {
                    content: {
                      ...currentBlock.content,
                      questions: [...(currentBlock.content?.questions || []), newQuestion]
                    }
                  });
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
            
            {currentBlock.content?.questions?.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No Questions Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add questions to create an interactive quiz
                </p>
                <Button onClick={() => {
                  const newQuestion = {
                    id: Date.now(),
                    question: '',
                    type: 'multiple-choice',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct: 0,
                    explanation: ''
                  };
                  updateBlock(selectedBlock!, {
                    content: {
                      ...currentBlock.content,
                      questions: [newQuestion]
                    }
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentBlock.content?.questions?.map((question: any, index: number) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const questions = currentBlock.content?.questions?.filter((q: any) => q.id !== question.id) || [];
                            updateBlock(selectedBlock!, {
                              content: { ...currentBlock.content, questions }
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={question.question}
                        onChange={(e) => {
                          const questions = currentBlock.content?.questions?.map((q: any) => 
                            q.id === question.id ? { ...q, question: e.target.value } : q
                          ) || [];
                          updateBlock(selectedBlock!, {
                            content: { ...currentBlock.content, questions }
                          });
                        }}
                        placeholder="Enter your question..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {question.options?.map((option: string, optionIndex: number) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Checkbox 
                              checked={question.correct === optionIndex}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const questions = currentBlock.content?.questions?.map((q: any) => 
                                    q.id === question.id ? { ...q, correct: optionIndex } : q
                                  ) || [];
                                  updateBlock(selectedBlock!, {
                                    content: { ...currentBlock.content, questions }
                                  });
                                }
                              }}
                            />
                            <Input
                              value={option}
                              onChange={(e) => {
                                const questions = currentBlock.content?.questions?.map((q: any) => 
                                  q.id === question.id ? { 
                                    ...q, 
                                    options: q.options.map((opt: string, i: number) => 
                                      i === optionIndex ? e.target.value : opt
                                    )
                                  } : q
                                ) || [];
                                updateBlock(selectedBlock!, {
                                  content: { ...currentBlock.content, questions }
                                });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => {
                          const questions = currentBlock.content?.questions?.map((q: any) => 
                            q.id === question.id ? { ...q, explanation: e.target.value } : q
                          ) || [];
                          updateBlock(selectedBlock!, {
                            content: { ...currentBlock.content, questions }
                          });
                        }}
                        placeholder="Explain the correct answer (optional)..."
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-4">
            <div>
              <Label>Interactive Content Type</Label>
              <Select 
                value={currentBlock.content?.type || 'code-editor'} 
                onValueChange={(value) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, type: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code-editor">Code Editor</SelectItem>
                  <SelectItem value="simulation">Simulation</SelectItem>
                  <SelectItem value="exercise">Practice Exercise</SelectItem>
                  <SelectItem value="drag-drop">Drag & Drop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {currentBlock.content?.type === 'code-editor' && (
              <>
                <div>
                  <Label>Programming Language</Label>
                  <Select 
                    value={currentBlock.content?.language || 'javascript'} 
                    onValueChange={(value) => updateBlock(selectedBlock!, {
                      content: { ...currentBlock.content, language: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="css">CSS</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Initial Code</Label>
                  <Textarea
                    value={currentBlock.content?.content || ''}
                    onChange={(e) => updateBlock(selectedBlock!, {
                      content: { ...currentBlock.content, content: e.target.value }
                    })}
                    placeholder="// Enter starter code for students..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}
            
            {currentBlock.content?.type === 'exercise' && (
              <div>
                <Label>Exercise Instructions</Label>
                <Textarea
                  value={currentBlock.content?.content || ''}
                  onChange={(e) => updateBlock(selectedBlock!, {
                    content: { ...currentBlock.content, content: e.target.value }
                  })}
                  placeholder="Describe the interactive exercise for students..."
                  rows={6}
                />
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="space-y-4">
            <div>
              <Label>Programming Language</Label>
              <Select 
                value={currentBlock.content?.language || 'javascript'} 
                onValueChange={(value) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, language: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="bash">Bash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code Content</Label>
              <Textarea
                value={currentBlock.content?.code || ''}
                onChange={(e) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, code: e.target.value }
                })}
                placeholder="// Enter your code here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div>
              <Label>Assignment Instructions</Label>
              <Textarea
                value={currentBlock.content?.instructions || ''}
                onChange={(e) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, instructions: e.target.value }
                })}
                placeholder="Describe the assignment requirements and instructions..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={currentBlock.content?.dueDate || ''}
                  onChange={(e) => updateBlock(selectedBlock!, {
                    content: { ...currentBlock.content, dueDate: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={currentBlock.content?.points || 100}
                  onChange={(e) => updateBlock(selectedBlock!, {
                    content: { ...currentBlock.content, points: parseInt(e.target.value) || 100 }
                  })}
                  min="0"
                />
              </div>
            </div>
          </div>
        );

      case 'embed':
        return (
          <div className="space-y-4">
            <div>
              <Label>Embed URL</Label>
              <Input
                value={currentBlock.content?.url || ''}
                onChange={(e) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, url: e.target.value }
                })}
                placeholder="Enter YouTube URL, embed code, or external link..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports YouTube, Vimeo, CodePen, and other embeddable content
              </p>
            </div>
            {currentBlock.content?.url && (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Youtube className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        );

      case 'callout':
        return (
          <div className="space-y-4">
            <div>
              <Label>Callout Type</Label>
              <Select 
                value={currentBlock.content?.type || 'info'} 
                onValueChange={(value) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, type: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={currentBlock.content?.title || ''}
                onChange={(e) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, title: e.target.value }
                })}
                placeholder="Enter callout title..."
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={currentBlock.content?.text || ''}
                onChange={(e) => updateBlock(selectedBlock!, {
                  content: { ...currentBlock.content, text: e.target.value }
                })}
                placeholder="Enter callout content..."
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Editor Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Advanced editor for {currentBlock.type} blocks is in development
            </p>
          </div>
        );
    }
  };

  // Render course setup step
  const renderSetupStep = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Information
          </CardTitle>
          <CardDescription>
            Set up your course details to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Course Title *</Label>
              <Input
                value={course.title}
                onChange={(e) => updateCourse({ title: e.target.value })}
                placeholder="Enter your course title..."
                className="text-lg"
              />
            </div>
            <div>
              <Label>Course Description</Label>
              <Textarea
                value={course.description}
                onChange={(e) => updateCourse({ description: e.target.value })}
                placeholder="Describe what students will learn in this course..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Difficulty Level</Label>
                <Select value={course.settings.difficulty} onValueChange={(value: any) => 
                  updateCourse({ settings: { ...course.settings, difficulty: value } })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={course.settings.category} onValueChange={(value) => 
                  updateCourse({ settings: { ...course.settings, category: value } })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Personal Development">Personal Development</SelectItem>
                    <SelectItem value="Health & Fitness">Health & Fitness</SelectItem>
                    <SelectItem value="Arts & Crafts">Arts & Crafts</SelectItem>
                    <SelectItem value="Language">Language</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={course.settings.language} onValueChange={(value) => 
                  updateCourse({ settings: { ...course.settings, language: value } })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setShowAIDialog(true)}>
                <Brain className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
              <Button variant="outline" onClick={() => setShowMediaDialog(true)}>
                <Video className="h-4 w-4 mr-2" />
                Media Studio
              </Button>
            </div>
            <Button 
              onClick={() => setCurrentStep('structure')}
              disabled={!course.title.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Continue to Structure
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render course structure step
  const renderStructureStep = () => (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Sidebar */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Course Structure</CardTitle>
              <Button onClick={addModule} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Module
              </Button>
            </div>
            <CardDescription>
              {course.modules.length} modules • {getTotalLessons()} lessons • {getTotalBlocks()} blocks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="p-4 space-y-2">
                {course.modules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No modules yet</p>
                    <p className="text-xs">Click "Add Module" to start</p>
                  </div>
                ) : (
                  course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="space-y-1 mb-3">
                      <div 
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedModule === module.id ? 'bg-blue-100 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => setSelectedModule(module.id)}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <Layers className="h-4 w-4" />
                        <span className="font-medium flex-1">{module.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {module.lessons.length}
                        </Badge>
                      </div>
                      {selectedModule === module.id && (
                        <div className="ml-8 space-y-1">
                          {module.lessons.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No lessons yet</p>
                          ) : (
                            module.lessons.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  selectedLesson === lesson.id ? 'bg-green-100 dark:bg-green-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => setSelectedLesson(lesson.id)}
                              >
                                <BookOpen className="h-3 w-3" />
                                <span className="text-sm flex-1">{lesson.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {lesson.blocks.length}
                                </Badge>
                              </div>
                            ))
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addLesson(module.id)}
                            className="w-full justify-start text-xs text-blue-600"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Lesson
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="col-span-8">
        {!selectedModule ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Build Your Course Structure</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding modules to organize your course content
              </p>
              <Button onClick={addModule}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Module
              </Button>
            </CardContent>
          </Card>
        ) : !selectedLesson ? (
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Module: {getCurrentModule()?.title}</CardTitle>
                  <CardDescription>Configure this module and add lessons</CardDescription>
                </div>
                <Button onClick={() => addLesson(selectedModule)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Module Title</Label>
                    <Input
                      value={getCurrentModule()?.title || ''}
                      onChange={(e) => updateModule(selectedModule, { title: e.target.value })}
                      placeholder="Enter module title..."
                    />
                  </div>
                  <div>
                    <Label>Module Description</Label>
                    <Textarea
                      value={getCurrentModule()?.description || ''}
                      onChange={(e) => updateModule(selectedModule, { description: e.target.value })}
                      placeholder="Describe what this module covers..."
                      rows={3}
                    />
                  </div>
                </div>

                {getCurrentModule()?.lessons.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No lessons in this module</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add lessons to organize your content into digestible parts
                    </p>
                    <Button onClick={() => addLesson(selectedModule)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Lesson
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Lessons ({getCurrentModule()?.lessons.length})</h4>
                      <Button onClick={() => addLesson(selectedModule)} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Lesson
                      </Button>
                    </div>
                    {getCurrentModule()?.lessons.map((lesson, index) => (
                      <Card key={lesson.id} className="p-4 cursor-move">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="font-medium">{lesson.title}</h5>
                              <p className="text-sm text-muted-foreground">
                                {lesson.blocks.length} blocks
                                {lesson.duration && ` • ${lesson.duration}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLesson(lesson.id)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLesson(lesson.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => deleteModule(selectedModule)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Module
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('content')}
                    disabled={getCurrentModule()?.lessons.length === 0}
                  >
                    Continue to Content
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Lesson content editor
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLesson(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>Lesson: {getCurrentLesson()?.title}</CardTitle>
                    <CardDescription>Add and organize content blocks</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    {blockTypes.map(blockType => (
                      <DropdownMenuItem
                        key={blockType.type}
                        onClick={() => addBlock(selectedLesson!, blockType.type)}
                        className="flex items-start gap-3 p-3"
                      >
                        <blockType.icon className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-medium">{blockType.label}</div>
                          <div className="text-xs text-muted-foreground">{blockType.description}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Lesson Title</Label>
                      <Input
                        value={getCurrentLesson()?.title || ''}
                        onChange={(e) => updateLesson(selectedLesson!, { title: e.target.value })}
                        placeholder="Enter lesson title..."
                      />
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <Input
                        value={getCurrentLesson()?.duration || ''}
                        onChange={(e) => updateLesson(selectedLesson!, { duration: e.target.value })}
                        placeholder="e.g., 15 min"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Lesson Description</Label>
                    <Textarea
                      value={getCurrentLesson()?.description || ''}
                      onChange={(e) => updateLesson(selectedLesson!, { description: e.target.value })}
                      placeholder="Describe what students will learn in this lesson..."
                      rows={2}
                    />
                  </div>

                  {getCurrentLesson()?.blocks.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No content blocks yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add content blocks to build your lesson
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Block
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                          {blockTypes.map(blockType => (
                            <DropdownMenuItem
                              key={blockType.type}
                              onClick={() => addBlock(selectedLesson!, blockType.type)}
                              className="flex items-start gap-3 p-3"
                            >
                              <blockType.icon className="h-4 w-4 mt-0.5" />
                              <div>
                                <div className="font-medium">{blockType.label}</div>
                                <div className="text-xs text-muted-foreground">{blockType.description}</div>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Content Blocks ({getCurrentLesson()?.blocks.length})</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Block
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64">
                            {blockTypes.map(blockType => (
                              <DropdownMenuItem
                                key={blockType.type}
                                onClick={() => addBlock(selectedLesson!, blockType.type)}
                                className="flex items-start gap-3 p-3"
                              >
                                <blockType.icon className="h-4 w-4 mt-0.5" />
                                <div>
                                  <div className="font-medium">{blockType.label}</div>
                                  <div className="text-xs text-muted-foreground">{blockType.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {getCurrentLesson()?.blocks.map((block, index) => {
                        const BlockIcon = blockTypes.find(bt => bt.type === block.type)?.icon || Type;
                        const hasContent = blockHasContent(block);
                        return (
                          <Card key={block.id} className={`p-4 ${!hasContent ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <BlockIcon className="h-5 w-5 text-blue-500" />
                                <div>
                                  <h5 className="font-medium">{block.title}</h5>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{blockTypes.find(bt => bt.type === block.type)?.label}</span>
                                    {!hasContent && (
                                      <>
                                        <span>•</span>
                                        <span className="text-orange-600 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          Needs content
                                        </span>
                                      </>
                                    )}
                                    {hasContent && (
                                      <>
                                        <span>•</span>
                                        <span className="text-green-600 flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Ready
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBlock(block.id);
                                    setShowBlockEditor(true);
                                  }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBlock(block.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  // Render content editing step
  const renderContentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Content Editor</h2>
          <p className="text-muted-foreground">Create and edit your course content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('structure')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Structure
          </Button>
          <Button 
            onClick={() => setCurrentStep('publish')}
            disabled={getTotalBlocks() === 0}
          >
            Continue to Publish
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {getTotalBlocks() === 0 ? (
        <div className="text-center py-12">
          <Edit3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content blocks yet</h3>
          <p className="text-muted-foreground mb-4">
            Go back to Structure to add content blocks to your lessons
          </p>
          <Button onClick={() => setCurrentStep('structure')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Structure
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Content Blocks Created</h3>
          <p className="text-muted-foreground mb-4">
            You have {getTotalBlocks()} content blocks across {getTotalLessons()} lessons
          </p>
          <p className="text-sm text-muted-foreground">
            Use the Structure tab to edit individual content blocks
          </p>
        </div>
      )}
    </div>
  );

  // Render publish step
  const renderPublishStep = () => {
    const isReadyToPublish = course.title.trim() && course.modules.length > 0 && getTotalLessons() > 0;
    
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Course Review & Publish
            </CardTitle>
            <CardDescription>
              Review your course and make it available to students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Course Summary */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Course Title</Label>
                <p className="font-medium">{course.title || 'Untitled Course'}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p className="font-medium">{course.settings.category || 'Not set'}</p>
              </div>
              <div>
                <Label>Modules</Label>
                <p className="font-medium">{course.modules.length}</p>
              </div>
              <div>
                <Label>Total Lessons</Label>
                <p className="font-medium">{getTotalLessons()}</p>
              </div>
              <div>
                <Label>Content Blocks</Label>
                <p className="font-medium">{getTotalBlocks()}</p>
              </div>
              <div>
                <Label>Difficulty</Label>
                <p className="font-medium">{course.settings.difficulty}</p>
              </div>
            </div>

            {/* Publishing Requirements */}
            <div className="space-y-4">
              <h3 className="font-semibold">Publishing Requirements</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {course.title.trim() ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className={course.title.trim() ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                    Course title set
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {course.modules.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className={course.modules.length > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                    At least one module created
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getTotalLessons() > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className={getTotalLessons() > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                    At least one lesson created
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Publishing Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Publishing Options</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Course</Label>
                  <p className="text-sm text-muted-foreground">Make this course discoverable to all students</p>
                </div>
                <Switch
                  checked={course.settings.isPublic}
                  onCheckedChange={(checked) => 
                    updateCourse({ settings: { ...course.settings, isPublic: checked } })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Course Price</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span>$</span>
                    <Input
                      type="number"
                      value={course.settings.price}
                      onChange={(e) => 
                        updateCourse({ settings: { ...course.settings, price: parseInt(e.target.value) || 0 } })
                      }
                      className="w-full"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Course Category</Label>
                  <Select 
                    value={course.settings.category} 
                    onValueChange={(value) => updateCourse({ settings: { ...course.settings, category: value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Personal Development">Personal Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              {isReadyToPublish ? (
                <Button onClick={publishCourse} size="lg" className="bg-gradient-to-r from-green-500 to-blue-500">
                  <Rocket className="h-5 w-5 mr-2" />
                  Publish Course
                </Button>
              ) : (
                <div className="text-center">
                  <Button disabled size="lg" className="mb-2">
                    <Rocket className="h-5 w-5 mr-2" />
                    Publish Course
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Complete all requirements above to publish
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Main render
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50/30 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1>Content Creator Studio</h1>
                  <p className="text-muted-foreground">
                    Create professional courses with advanced editing tools
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="hidden md:flex items-center gap-2 ml-8">
                {[
                  { id: 'setup', label: 'Setup', icon: Settings },
                  { id: 'structure', label: 'Structure', icon: Layers },
                  { id: 'content', label: 'Content', icon: Edit3 },
                  { id: 'publish', label: 'Publish', icon: Rocket }
                ].map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <Button
                      variant={currentStep === step.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentStep(step.id as any)}
                      className="flex items-center gap-2"
                      disabled={
                        step.id === 'structure' && !course.title.trim() ||
                        step.id === 'content' && course.modules.length === 0 ||
                        step.id === 'publish' && getTotalLessons() === 0
                      }
                    >
                      <step.icon className="h-4 w-4" />
                      {step.label}
                    </Button>
                    {index < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Advanced Tools */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIDialog(true)}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMediaDialog(true)}
              >
                <Video className="h-4 w-4 mr-2" />
                Media Studio
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollaborationDialog(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Collaborate
              </Button>

              {/* Save Status */}
              <Badge variant={saveStatus === 'saved' ? 'default' : saveStatus === 'saving' ? 'secondary' : 'destructive'}>
                {saveStatus === 'saving' ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {saveStatus}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {currentStep === 'setup' && renderSetupStep()}
        {currentStep === 'structure' && renderStructureStep()}
        {currentStep === 'content' && renderContentStep()}
        {currentStep === 'publish' && renderPublishStep()}
      </div>

      {/* AI Assistant Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Content Assistant
            </DialogTitle>
            <DialogDescription>
              Generate course content using AI based on your specifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>What would you like AI to generate?</Label>
              <Select value={aiPrompt.type} onValueChange={(value: any) => 
                setAiPrompt(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outline">Course Module Outline</SelectItem>
                  <SelectItem value="content">Lesson Content</SelectItem>
                  <SelectItem value="quiz">Quiz Questions</SelectItem>
                  <SelectItem value="lesson">Complete Lesson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic or Subject *</Label>
              <Input
                value={aiPrompt.context}
                onChange={(e) => setAiPrompt(prev => ({ ...prev, context: e.target.value }))}
                placeholder="e.g., JavaScript fundamentals, Digital Marketing basics..."
              />
            </div>
            <div>
              <Label>Specific Requirements</Label>
              <Textarea
                value={aiPrompt.requirements}
                onChange={(e) => setAiPrompt(prev => ({ ...prev, requirements: e.target.value }))}
                placeholder="e.g., Include practical examples, focus on hands-on learning..."
                rows={3}
              />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={aiPrompt.targetAudience} onValueChange={(value) => 
                setAiPrompt(prev => ({ ...prev, targetAudience: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginners">Beginners</SelectItem>
                  <SelectItem value="Intermediate">Intermediate Students</SelectItem>
                  <SelectItem value="Advanced">Advanced Learners</SelectItem>
                  <SelectItem value="Professionals">Working Professionals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>Cancel</Button>
            <Button onClick={generateWithAI} disabled={!aiPrompt.context.trim()}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Studio Dialog */}
      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Media Recording Studio
            </DialogTitle>
            <DialogDescription>
              Record videos, audio, or upload media files for your course
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="record" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="record">Record</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
            </TabsList>
            
            <TabsContent value="record" className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: 'screen', label: 'Screen Recording', icon: Monitor },
                  { type: 'camera', label: 'Camera Recording', icon: Camera },
                  { type: 'audio', label: 'Audio Recording', icon: Mic }
                ].map(option => (
                  <Card 
                    key={option.type}
                    className={`cursor-pointer transition-all ${
                      recordingType === option.type ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setRecordingType(option.type as any)}
                  >
                    <CardContent className="p-6 text-center">
                      <option.icon className="h-8 w-8 mx-auto mb-2" />
                      <h3 className="font-medium">{option.label}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative">
                {isRecording ? (
                  <>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      muted 
                      className="w-full h-full object-cover rounded-lg"
                      style={{ display: recordingType === 'audio' ? 'none' : 'block' }}
                    />
                    {recordingType === 'audio' && (
                      <div className="text-white text-center">
                        <Mic className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                        <p>Recording Audio...</p>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      REC
                    </div>
                  </>
                ) : (
                  <div className="text-white text-center">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Ready to Record</p>
                    <p className="text-sm opacity-75">Click start to begin {recordingType} recording</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600">
                    <Play className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive">
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-6">
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Upload Media Files</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: MP4, MOV, MP3, WAV, JPG, PNG, PDF, DOC, PPT (Max 100MB each)
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="library" className="space-y-6">
              {mediaFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No media files yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Record or upload files to build your media library
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {mediaFiles.map(file => (
                    <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {file.type === 'video' && <FileVideo className="h-8 w-8" />}
                        {file.type === 'audio' && <FileAudio className="h-8 w-8" />}
                        {file.type === 'image' && <FileImage className="h-8 w-8" />}
                        {file.type === 'document' && <FileText className="h-8 w-8" />}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm truncate">{file.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            Use
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setMediaFiles(prev => prev.filter(f => f.id !== file.id));
                              URL.revokeObjectURL(file.url);
                              toast.success('File deleted');
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Collaboration Dialog */}
      <Dialog open={showCollaborationDialog} onOpenChange={setShowCollaborationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Course Collaboration
            </DialogTitle>
            <DialogDescription>
              Invite team members to collaborate on this course
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter email address..." 
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                className="flex-1" 
              />
              <Button onClick={addCollaborator} disabled={!newCollaboratorEmail.trim()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Collaborators ({collaborators.length})</Label>
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collaborators added yet</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collaborator, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {collaborator.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{collaborator}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeCollaborator(collaborator)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollaborationDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Editor Dialog */}
      <Dialog open={showBlockEditor} onOpenChange={setShowBlockEditor}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {blockTypes.find(bt => bt.type === getCurrentBlock()?.type)?.label} Block</DialogTitle>
            <DialogDescription>
              Customize your content block with professional editing tools
            </DialogDescription>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-6">
              <div>
                <Label>Block Title</Label>
                <Input
                  value={getCurrentBlock()?.title || ''}
                  onChange={(e) => updateBlock(selectedBlock, { title: e.target.value })}
                  placeholder="Enter block title..."
                />
              </div>
              
              {renderBlockEditor()}

              <Separator />

              <div className="space-y-4">
                <Label>Block Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Required for completion</Label>
                      <p className="text-xs text-muted-foreground">Students must complete this block</p>
                    </div>
                    <Switch
                      checked={getCurrentBlock()?.settings.required}
                      onCheckedChange={(checked) => updateBlock(selectedBlock, {
                        settings: { ...getCurrentBlock()?.settings, required: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Allow comments</Label>
                      <p className="text-xs text-muted-foreground">Let students discuss this content</p>
                    </div>
                    <Switch
                      checked={getCurrentBlock()?.settings.allowComments}
                      onCheckedChange={(checked) => updateBlock(selectedBlock, {
                        settings: { ...getCurrentBlock()?.settings, allowComments: checked }
                      })}
                    />
                  </div>
                  {['quiz', 'assignment'].includes(getCurrentBlock()?.type || '') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Points</Label>
                        <Input
                          type="number"
                          value={getCurrentBlock()?.settings.points || 10}
                          onChange={(e) => updateBlock(selectedBlock, {
                            settings: { ...getCurrentBlock()?.settings, points: parseInt(e.target.value) || 10 }
                          })}
                          min="0"
                        />
                      </div>
                      {getCurrentBlock()?.type === 'quiz' && (
                        <div>
                          <Label className="text-sm">Time Limit (seconds)</Label>
                          <Input
                            type="number"
                            value={getCurrentBlock()?.settings.timeLimit || 300}
                            onChange={(e) => updateBlock(selectedBlock, {
                              settings: { ...getCurrentBlock()?.settings, timeLimit: parseInt(e.target.value) || 300 }
                            })}
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockEditor(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowBlockEditor(false)}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}