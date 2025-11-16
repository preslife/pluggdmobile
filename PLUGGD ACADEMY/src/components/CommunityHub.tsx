import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  Flag,
  MoreHorizontal,
  Send,
  Image,
  Link,
  Hash,
  AtSign,
  Clock,
  Eye,
  ThumbsUp,
  Star,
  Award,
  Globe,
  Lock,
  UserPlus,
  Settings,
  Bell,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    badge?: string;
  };
  category: string;
  tags: string[];
  replies: number;
  likes: number;
  views: number;
  createdAt: string;
  lastActivity: string;
  isPinned?: boolean;
  isSolved?: boolean;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  category: string;
  isPrivate: boolean;
  creator: string;
  createdAt: string;
}

export function CommunityHub() {
  // Clean state - no mock data
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [featuredMembers, setFeaturedMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories
  const categories = [
    { id: 'all', name: 'All Categories', icon: Globe },
    { id: 'general', name: 'General Discussion', icon: MessageSquare },
    { id: 'help', name: 'Help & Support', icon: Users },
    { id: 'study-tips', name: 'Study Tips', icon: Star },
    { id: 'career', name: 'Career Advice', icon: TrendingUp },
    { id: 'showcase', name: 'Project Showcase', icon: Award }
  ];

  // Empty state components
  const EmptyDiscussionsState = () => (
    <motion.div 
      className="text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <MessageSquare className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Discussions Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Be the first to start a conversation! Share your thoughts, ask questions, 
        or help others in the community.
      </p>
      <div className="space-y-3">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
          <Plus className="h-4 w-4 mr-2" />
          Start First Discussion
        </Button>
        <p className="text-sm text-muted-foreground">
          Create a welcoming space for learners to connect and share
        </p>
      </div>
    </motion.div>
  );

  const EmptyStudyGroupsState = () => (
    <Card>
      <CardContent className="text-center py-12">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Study Groups</h3>
        <p className="text-muted-foreground mb-6">
          Join or create study groups to learn together with peers
        </p>
        <div className="space-x-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Study Group
          </Button>
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Browse Groups
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const WelcomeToCommunity = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8"
    >
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-2 border-dashed border-blue-200 dark:border-blue-800">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-3">Welcome to the Community!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect with fellow learners, share knowledge, ask questions, 
            and build meaningful relationships in our learning community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Discussion
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Join Study Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const CommunityStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">0</div>
          <p className="text-sm text-muted-foreground">Discussions</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">0</div>
          <p className="text-sm text-muted-foreground">Members</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">0</div>
          <p className="text-sm text-muted-foreground">Study Groups</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">0</div>
          <p className="text-sm text-muted-foreground">Helpful Answers</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/30 dark:to-purple-950/30 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Community Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect, learn, and grow together with fellow learners
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
            <Plus className="h-4 w-4 mr-2" />
            New Discussion
          </Button>
        </div>
      </div>

      {/* Community Stats */}
      <CommunityStats />

      {/* Welcome for empty state */}
      {discussions.length === 0 && <WelcomeToCommunity />}

      {/* Search and Categories */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search discussions, groups, or members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const Icon = category.icon;
              return (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="discussions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="study-groups">Study Groups</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="discussions">
          {discussions.length === 0 ? (
            <EmptyDiscussionsState />
          ) : (
            <div className="space-y-4">
              {/* Discussion threads would be rendered here */}
            </div>
          )}
        </TabsContent>

        <TabsContent value="study-groups">
          {studyGroups.length === 0 ? (
            <EmptyStudyGroupsState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Study group cards would be rendered here */}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Community Members</h3>
              <p className="text-muted-foreground mb-6">
                Active community members will be featured here
              </p>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending">
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trending Topics</h3>
              <p className="text-muted-foreground">
                Popular discussions and trending topics will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Community Guidelines */}
      {discussions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Community Guidelines
              </CardTitle>
              <CardDescription>
                Help us maintain a positive and productive learning environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Be Respectful</h4>
                  <p className="text-sm text-muted-foreground">
                    Treat all community members with kindness and respect
                  </p>
                </div>
                <div className="text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Help Others</h4>
                  <p className="text-sm text-muted-foreground">
                    Share knowledge and support fellow learners on their journey
                  </p>
                </div>
                <div className="text-center">
                  <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Stay On Topic</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep discussions relevant and constructive
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}