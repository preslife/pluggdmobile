import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  BookOpen, 
  Target, 
  Users, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  MapPin,
  Bell,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Download,
  Share,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  Calendar as CalendarGrid,
  List,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: 'class' | 'assignment' | 'exam' | 'study-session' | 'office-hours' | 'deadline';
  startTime: Date;
  endTime: Date;
  location?: string;
  instructor?: string;
  course: {
    id: string;
    name: string;
    color: string;
  };
  isOnline: boolean;
  meetingLink?: string;
  isCompleted?: boolean;
  priority: 'high' | 'medium' | 'low';
  participants?: number;
  maxParticipants?: number;
  materials?: { name: string; url: string }[];
}

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'React Advanced Patterns - Live Session',
    description: 'Deep dive into compound components, render props, and advanced React patterns',
    type: 'class',
    startTime: new Date(2024, 11, 15, 14, 0), // Today 2:00 PM
    endTime: new Date(2024, 11, 15, 15, 30),
    location: 'Virtual Classroom',
    instructor: 'Sarah Johnson',
    course: { id: 'react-adv', name: 'Advanced React', color: 'bg-blue-500' },
    isOnline: true,
    meetingLink: 'https://meet.example.com/react-class',
    priority: 'high',
    participants: 28,
    maxParticipants: 30
  },
  {
    id: '2',
    title: 'JavaScript Project Submission',
    description: 'Submit your final JavaScript project with documentation',
    type: 'assignment',
    startTime: new Date(2024, 11, 16, 23, 59),
    endTime: new Date(2024, 11, 16, 23, 59),
    course: { id: 'js-fund', name: 'JavaScript Fundamentals', color: 'bg-yellow-500' },
    isOnline: true,
    priority: 'high',
    materials: [
      { name: 'Project Requirements.pdf', url: '#' },
      { name: 'Submission Template', url: '#' }
    ]
  },
  {
    id: '3',
    title: 'UI/UX Design Principles Quiz',
    description: 'Multiple choice quiz covering design fundamentals and user experience principles',
    type: 'exam',
    startTime: new Date(2024, 11, 17, 10, 0),
    endTime: new Date(2024, 11, 17, 11, 0),
    course: { id: 'uiux', name: 'UI/UX Design', color: 'bg-purple-500' },
    isOnline: true,
    priority: 'high'
  },
  {
    id: '4',
    title: 'Study Group - Algorithm Practice',
    description: 'Collaborative problem solving session focusing on data structures and algorithms',
    type: 'study-session',
    startTime: new Date(2024, 11, 18, 19, 0),
    endTime: new Date(2024, 11, 18, 21, 0),
    location: 'Library Room 204',
    course: { id: 'algorithms', name: 'Data Structures', color: 'bg-green-500' },
    isOnline: false,
    priority: 'medium',
    participants: 8,
    maxParticipants: 12
  },
  {
    id: '5',
    title: 'Office Hours with Prof. Chen',
    description: 'Open office hours for questions about recent coursework and upcoming projects',
    type: 'office-hours',
    startTime: new Date(2024, 11, 19, 15, 0),
    endTime: new Date(2024, 11, 19, 16, 0),
    instructor: 'Prof. Michael Chen',
    course: { id: 'web-dev', name: 'Web Development', color: 'bg-indigo-500' },
    isOnline: true,
    meetingLink: 'https://meet.example.com/office-hours',
    priority: 'low'
  },
  {
    id: '6',
    title: 'Course Evaluation Deadline',
    description: 'Submit your course evaluation and feedback',
    type: 'deadline',
    startTime: new Date(2024, 11, 20, 17, 0),
    endTime: new Date(2024, 11, 20, 17, 0),
    course: { id: 'react-adv', name: 'Advanced React', color: 'bg-blue-500' },
    isOnline: true,
    priority: 'low'
  }
];

const eventTypes = [
  { id: 'all', label: 'All Events', icon: CalendarIcon },
  { id: 'class', label: 'Classes', icon: Video },
  { id: 'assignment', label: 'Assignments', icon: BookOpen },
  { id: 'exam', label: 'Exams', icon: Target },
  { id: 'study-session', label: 'Study Sessions', icon: Users },
  { id: 'office-hours', label: 'Office Hours', icon: Clock },
  { id: 'deadline', label: 'Deadlines', icon: AlertCircle }
];

export function StudentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'agenda' | 'week'>('agenda');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events] = useState<CalendarEvent[]>(mockEvents);

  // Get events for current date range
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesType = selectedType === 'all' || event.type === selectedType;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.course.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return filteredEvents.filter(event => 
      event.startTime >= now && event.startTime <= nextWeek
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  // Get today's events
  const getTodaysEvents = () => {
    const today = new Date();
    return getEventsForDate(today);
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get event type info
  const getEventTypeInfo = (type: string) => {
    const eventType = eventTypes.find(t => t.id === type);
    return eventType || eventTypes[0];
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Join meeting
  const joinMeeting = (event: CalendarEvent) => {
    if (event.meetingLink) {
      window.open(event.meetingLink, '_blank');
    }
  };

  const renderAgendaView = () => {
    const todaysEvents = getTodaysEvents();
    const upcomingEvents = getUpcomingEvents();

    return (
      <div className="space-y-6">
        {/* Today's Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-500" />
              Today - {formatDate(new Date())}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No events today</h3>
                <p className="text-sm text-muted-foreground">
                  Enjoy your free time or catch up on coursework!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${event.course.color} text-white`}>
                              {React.createElement(getEventTypeInfo(event.type).icon, { className: "h-4 w-4" })}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{event.title}</h4>
                                <Badge variant="outline" className={getPriorityColor(event.priority)}>
                                  {event.priority}
                                </Badge>
                                {event.isCompleted && (
                                  <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {event.course.name}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.meetingLink && (
                              <Button size="sm" onClick={() => joinMeeting(event)}>
                                <Video className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Bell className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Upcoming Events (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No upcoming events</h3>
                <p className="text-sm text-muted-foreground">
                  Your schedule is clear for the next week
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex flex-col items-center text-center min-w-[60px]">
                      <div className="text-lg font-bold">{event.startTime.getDate()}</div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {event.startTime.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    
                    <div className={`w-1 h-12 rounded-full ${event.course.color}`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getEventTypeInfo(event.type).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatTime(event.startTime)}</span>
                        <span>•</span>
                        <span>{event.course.name}</span>
                        {event.isOnline && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500">Online</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {event.priority === 'high' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      {event.meetingLink && (
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 7);
                setCurrentDate(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 7);
                setCurrentDate(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <Card key={index} className={`${isToday ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm text-center">
                    <div className="font-medium">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className={`text-lg ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {day.getDate()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`p-2 rounded text-xs ${event.course.color} text-white cursor-pointer hover:opacity-90 transition-opacity`}
                        title={event.title}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-80">{formatTime(event.startTime)}</div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:to-gray-800 overflow-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              📅 My Schedule
            </h1>
            <p className="text-muted-foreground mt-2">
              Keep track of your classes, assignments, and important deadlines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {[
            { label: 'Today\'s Events', value: getTodaysEvents().length, icon: CalendarIcon, color: 'bg-blue-500' },
            { label: 'This Week', value: getUpcomingEvents().length, icon: Clock, color: 'bg-green-500' },
            { label: 'Assignments Due', value: filteredEvents.filter(e => e.type === 'assignment' && e.startTime > new Date()).length, icon: Target, color: 'bg-orange-500' },
            { label: 'Live Classes', value: filteredEvents.filter(e => e.type === 'class' && e.isOnline).length, icon: Video, color: 'bg-purple-500' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events, courses, or instructors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(value: any) => setView(value)} className="space-y-6">
          <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm">
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <CalendarGrid className="h-4 w-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda">
            {renderAgendaView()}
          </TabsContent>

          <TabsContent value="week">
            {renderWeekView()}
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Full Calendar View</h3>
                <p className="text-muted-foreground mb-6">
                  Interactive monthly calendar with drag-and-drop event management
                </p>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Coming in v2.0
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}