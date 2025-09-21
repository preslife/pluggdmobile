import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bug, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Star,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'general';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'in_review' | 'in_progress' | 'resolved' | 'dismissed';
  user_email: string;
  created_at: string;
  votes: number;
  user_voted?: boolean;
}

export const FeedbackSystem = () => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('view');
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type: 'general' as FeedbackItem['type'],
    title: '',
    description: '',
    priority: 'medium' as FeedbackItem['priority']
  });

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      
      // For now, use mock data since feedback table doesn't exist
      const mockFeedback: FeedbackItem[] = [
        {
          id: '1',
          type: 'feature',
          title: 'Add dark mode toggle',
          description: 'It would be great to have a dark mode option in the settings',
          priority: 'medium',
          status: 'in_progress',
          user_email: 'user@example.com',
          created_at: new Date().toISOString(),
          votes: 15,
          user_voted: false
        },
        {
          id: '2',
          type: 'bug',
          title: 'Audio player not working on mobile',
          description: 'The audio player fails to load on mobile devices',
          priority: 'high',
          status: 'in_review',
          user_email: 'user2@example.com',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          votes: 8,
          user_voted: true
        },
        {
          id: '3',
          type: 'improvement',
          title: 'Faster search results',
          description: 'Search could be more responsive and show results as you type',
          priority: 'low',
          status: 'submitted',
          user_email: 'user3@example.com',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          votes: 3,
          user_voted: false
        }
      ];
      
      setFeedbackItems(mockFeedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!user || !formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // In a real implementation, this would submit to the database
      const newFeedback: FeedbackItem = {
        id: Date.now().toString(),
        type: formData.type,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'submitted',
        user_email: user.email || '',
        created_at: new Date().toISOString(),
        votes: 0,
        user_voted: false
      };

      setFeedbackItems(prev => [newFeedback, ...prev]);

      // Reset form
      setFormData({
        type: 'general',
        title: '',
        description: '',
        priority: 'medium'
      });

      setActiveTab('view');

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const voteFeedback = async (feedbackId: string) => {
    if (!user) return;

    try {
      const item = feedbackItems.find(item => item.id === feedbackId);
      if (!item) return;

      setFeedbackItems(prev => 
        prev.map(feedbackItem => 
          feedbackItem.id === feedbackId 
            ? { 
                ...feedbackItem, 
                votes: feedbackItem.user_voted ? feedbackItem.votes - 1 : feedbackItem.votes + 1,
                user_voted: !feedbackItem.user_voted 
              }
            : feedbackItem
        )
      );

      toast({
        title: item.user_voted ? "Vote removed" : "Vote added",
        description: "Thank you for your input!",
      });

    } catch (error) {
      toast({
        title: "Vote Failed",
        description: "Failed to register vote",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'feature':
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'improvement':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'general':
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'submitted':
        return 'secondary';
      case 'in_review':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'outline';
      case 'dismissed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: FeedbackItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading feedback...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback & Suggestions
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'view' ? 'default' : 'outline'}
              onClick={() => setActiveTab('view')}
            >
              View Feedback
            </Button>
            <Button
              variant={activeTab === 'submit' ? 'default' : 'outline'}
              onClick={() => setActiveTab('submit')}
            >
              Submit Feedback
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Submit Feedback Form */}
      {activeTab === 'submit' && (
        <Card>
          <CardHeader>
            <CardTitle>Submit New Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {(['bug', 'feature', 'improvement', 'general'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={formData.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                    className="flex items-center gap-2"
                  >
                    {getTypeIcon(type)}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
                  <Button
                    key={priority}
                    variant={formData.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, priority }))}
                    className={getPriorityColor(priority)}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Brief description of your feedback"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Detailed description of your feedback, including steps to reproduce if it's a bug"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <Button 
              onClick={submitFeedback} 
              disabled={submitting || !formData.title.trim() || !formData.description.trim()}
              className="w-full"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      {activeTab === 'view' && (
        <div className="space-y-4">
          {feedbackItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No feedback submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            feedbackItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(item.type)}
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <span>{item.user_email}</span>
                      </div>
                    </div>

                    {/* Vote Button */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant={item.user_voted ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => voteFeedback(item.id)}
                        disabled={!user}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium">{item.votes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};