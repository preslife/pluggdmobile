import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { VideoConference } from './VideoConference';
import { CollaborativeWhiteboard } from './CollaborativeWhiteboard';
import { useWebRTC, Participant } from './utils/useWebRTC';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  Share, 
  MessageSquare, 
  Settings,
  Phone,
  PhoneOff,
  Monitor,
  Camera,
  Volume2,
  VolumeX,
  MoreVertical,
  UserPlus,
  Clock,
  Calendar,
  FileText,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Zap,
  Eye,
  EyeOff,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Hand,
  PenTool,
  Square,
  Circle,
  Type,
  Eraser,
  Undo,
  Redo,
  Save,
  Trash2,
  Grid,
  Layers,
  MousePointer,
  ArrowUp,
  ThumbsUp,
  Send,
  Star,
  BarChart3,
  PieChart,
  TrendingUp,
  Brain,
  Lightbulb,
  Target,
  Award,
  BookOpen,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  VolumeIcon,
  Headphones,
  Gamepad2,
  Coffee,
  Timer,
  ShuffleIcon,
  RefreshCw,
  Copy,
  Link,
  ExternalLink,
  Filter,
  Search,
  SortAsc,
  ChevronDown,
  ChevronUp,
  Maximize,
  Minimize,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VirtualClassroomProps {
  userRole: 'student' | 'creator' | 'admin';
  roomId?: string;
  courseName?: string;
}

// Breakout Rooms Component
function BreakoutRooms({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [rooms, setRooms] = useState([
    { id: '1', name: 'Room 1: React Hooks', participants: ['Alex Johnson', 'Maria Garcia'], capacity: 4 },
    { id: '2', name: 'Room 2: State Management', participants: ['David Chen'], capacity: 4 },
    { id: '3', name: 'Room 3: Performance', participants: [], capacity: 4 }
  ]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Breakout Rooms</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{room.name}</h3>
                  <Badge variant="outline">
                    {room.participants.length}/{room.capacity}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  {room.participants.length > 0 ? (
                    room.participants.map((participant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">{participant.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{participant}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No participants yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Join Room
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
          <Button variant="outline">Auto Assign</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Live Polls Component
function LivePolls({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentPoll, setCurrentPoll] = useState({
    question: "Which React pattern do you find most challenging?",
    options: [
      { text: "Custom Hooks", votes: 8 },
      { text: "Context API", votes: 12 },
      { text: "Higher-Order Components", votes: 5 },
      { text: "Render Props", votes: 3 }
    ],
    totalVotes: 28,
    userVoted: false
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Live Poll</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">{currentPoll.question}</h3>
          
          <div className="space-y-3">
            {currentPoll.options.map((option, index) => {
              const percentage = (option.votes / currentPoll.totalVotes) * 100;
              return (
                <div key={index} className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-auto p-3 justify-start"
                    disabled={currentPoll.userVoted}
                  >
                    <div className="w-full text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span>{option.text}</span>
                        <span className="text-sm text-muted-foreground">
                          {option.votes} votes
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Total votes: {currentPoll.totalVotes}
          </div>

          {currentPoll.userVoted && (
            <Badge className="w-full justify-center bg-green-100 text-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Vote Recorded
            </Badge>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function VirtualClassroom({ 
  userRole, 
  roomId = 'default-room',
  courseName = 'Advanced React Patterns'
}: VirtualClassroomProps) {
  // Generate user info
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userName = userRole === 'creator' ? 'Dr. Sarah Wilson' : 
                   userRole === 'admin' ? 'Admin User' :
                   `Student ${Math.floor(Math.random() * 1000)}`;

  // UI State
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [showLivePolls, setShowLivePolls] = useState(false);
  
  // Collaboration State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({
    '👍': 5,
    '👏': 3,
    '🤔': 2,
    '💡': 8
  });

  // WebRTC chat messages (separate from WebRTC data)
  const [webRTCChatMessages, setWebRTCChatMessages] = useState<any[]>([]);
  
  // Handle WebRTC chat messages
  useEffect(() => {
    const handleWebRTCChat = (event: any) => {
      const { message } = event.detail;
      setWebRTCChatMessages(prev => [...prev, {
        id: message.id,
        sender: message.userName,
        message: message.message,
        timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInstructor: false, // Will be determined by user role
        type: 'message'
      }]);
    };

    window.addEventListener('webrtc-chat-message', handleWebRTCChat);
    return () => window.removeEventListener('webrtc-chat-message', handleWebRTCChat);
  }, []);

  // Initialize chat with demo messages
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      sender: 'Dr. Sarah Wilson',
      message: 'Welcome everyone! Today we\'ll be covering advanced React patterns with live coding demos.',
      timestamp: '2:30 PM',
      isInstructor: true,
      type: 'message'
    },
    {
      id: '2',
      sender: 'System',
      message: 'WebRTC video conferencing is now active. Real-time collaboration enabled.',
      timestamp: '2:31 PM',
      isInstructor: false,
      type: 'system'
    }
  ]);

  // Merge WebRTC chat messages with regular chat
  const allChatMessages = [...chatMessages, ...webRTCChatMessages].sort((a, b) => 
    new Date(`1970/01/01 ${a.timestamp}`).getTime() - new Date(`1970/01/01 ${b.timestamp}`).getTime()
  );

  const [newMessage, setNewMessage] = useState('');

  // Handle participant updates from WebRTC
  const handleParticipantUpdate = useCallback((webRTCParticipants: Participant[]) => {
    setParticipants(webRTCParticipants);
  }, []);

  // Handle screen share changes
  const handleScreenShareChange = useCallback((sharing: boolean) => {
    setIsScreenSharing(sharing);
  }, []);

  // Handle whiteboard data
  const handleWhiteboardData = useCallback((data: any) => {
    console.log('Whiteboard data received:', data);
    // This would be handled by the whiteboard component
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now().toString(),
        sender: userName,
        message: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInstructor: userRole === 'creator' || userRole === 'admin',
        type: 'message'
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleReaction = (emoji: string) => {
    setReactionCounts(prev => ({
      ...prev,
      [emoji]: prev[emoji] + 1
    }));
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {courseName}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Live Session</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{participants.length + 1} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span>WebRTC Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span>AI Insights Active</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isRecording && (
              <Badge className="bg-red-100 text-red-700 border-red-300 animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                Recording
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecording(!isRecording)}
              className={isRecording ? 'bg-red-50 border-red-300' : ''}
            >
              <div className={`w-3 h-3 rounded-full mr-2 ${isRecording ? 'bg-red-500' : 'bg-gray-400'}`} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={showWhiteboard ? 'bg-blue-50 border-blue-300' : ''}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Whiteboard
            </Button>
            
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Live Reactions Bar */}
        <div className="flex items-center justify-between mt-3 p-2 bg-gradient-to-r from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/20 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Live Reactions:</span>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(emoji)}
                className="h-8 px-2"
              >
                <span className="mr-1">{emoji}</span>
                <span className="text-xs">{count}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700">
              <TrendingUp className="h-3 w-3 mr-1" />
              High Engagement
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              <Target className="h-3 w-3 mr-1" />
              89% Attention
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Video Conference Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {/* WebRTC Video Conference */}
            <VideoConference
              roomId={roomId}
              userId={userId}
              userName={userName}
              isHost={userRole === 'creator' || userRole === 'admin'}
              onParticipantUpdate={handleParticipantUpdate}
              onScreenShareChange={handleScreenShareChange}
              className="h-full"
            />
            
            {/* Collaborative Whiteboard Overlay */}
            {showWhiteboard && (
              <CollaborativeWhiteboard
                isActive={showWhiteboard}
                userId={userId}
                userName={userName}
                onClose={() => setShowWhiteboard(false)}
                onDataChange={handleWhiteboardData}
                className="absolute inset-0 z-20"
              />
            )}
          </div>

          {/* Enhanced Control Bar */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-2">
              <Button
                variant={isHandRaised ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsHandRaised(!isHandRaised)}
              >
                <Hand className="h-4 w-4 mr-2" />
                {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
              </Button>
              
              <Button 
                variant={showWhiteboard ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowWhiteboard(!showWhiteboard)}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Whiteboard
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowBreakoutRooms(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Breakout Rooms
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowLivePolls(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Polls
              </Button>
              
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
              
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Materials
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Sidebar */}
        {showChat && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 flex flex-col border-l border-gray-200 dark:border-gray-700"
          >
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 m-4 mb-2">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="participants">People</TabsTrigger>
                <TabsTrigger value="materials">Files</TabsTrigger>
                <TabsTrigger value="insights">AI</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="flex-1 flex flex-col m-4 mt-2">
                <ScrollArea className="flex-1 border rounded-lg p-4 bg-white/50 dark:bg-gray-900/50">
                  <div className="space-y-3">
                    {allChatMessages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${
                            message.type === 'system' ? 'text-blue-500' :
                            message.isInstructor ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {message.sender}
                          </span>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          {message.sender !== userName && message.type !== 'system' && (
                            <Badge className="text-xs bg-purple-100 text-purple-700">
                              WebRTC
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${
                          message.type === 'system' ? 'text-blue-600 italic' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {message.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="participants" className="flex-1 m-4 mt-2">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {/* Local user */}
                    <Card className="p-3 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-blue-500 text-white">{userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{userName} (You)</p>
                            <div className="flex items-center gap-2">
                              {(userRole === 'creator' || userRole === 'admin') && (
                                <Badge variant="secondary" className="text-xs">Host</Badge>
                              )}
                              {isHandRaised && (
                                <Badge className="text-xs bg-yellow-100 text-yellow-700">Hand Raised</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className="text-xs bg-green-100 text-green-700">Connected</Badge>
                        </div>
                      </div>
                    </Card>
                    
                    {/* WebRTC participants */}
                    {participants.map((participant) => (
                      <Card key={participant.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                                participant.isConnected ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{participant.name}</p>
                              <div className="flex items-center gap-2">
                                {participant.isHost && <Badge variant="secondary" className="text-xs">Host</Badge>}
                                <Badge className={`text-xs ${
                                  participant.connectionState === 'connected' ? 'bg-green-100 text-green-700' :
                                  participant.connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {participant.connectionState}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!participant.hasAudio && <MicOff className="h-4 w-4 text-gray-400" />}
                            {!participant.hasVideo && <VideoOff className="h-4 w-4 text-gray-400" />}
                            {participant.isScreenSharing && <Monitor className="h-4 w-4 text-blue-500" />}
                            <Button variant="ghost" size="icon" className="w-6 h-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {participants.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">No other participants yet</p>
                        <p className="text-xs text-gray-400 mt-1">Others will appear here when they join</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="materials" className="flex-1 m-4 mt-2">
                <Card className="p-4">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-lg">Shared Files</CardTitle>
                    <CardDescription>Course materials and resources</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">React_Patterns_Slides.pdf</span>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Code_Examples.zip</span>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <PenTool className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Whiteboard_Session.png</span>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button variant="outline" className="w-full mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="flex-1 m-4 mt-2">
                <Card className="p-4">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      AI Insights
                    </CardTitle>
                    <CardDescription>Real-time classroom analytics</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">High Engagement</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        89% of students are actively engaged. Great use of visual examples!
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Suggestion</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Consider slowing down the useEffect explanation. 3 students showed confusion signals.
                      </p>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-sm">Learning Goals</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        75% progress on "Custom Hooks" objective. Breakout activity recommended.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quick Actions</h4>
                      <Button variant="outline" size="sm" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Create Quiz
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        Form Groups
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <BreakoutRooms isOpen={showBreakoutRooms} onClose={() => setShowBreakoutRooms(false)} />
      <LivePolls isOpen={showLivePolls} onClose={() => setShowLivePolls(false)} />
    </div>
  );
}