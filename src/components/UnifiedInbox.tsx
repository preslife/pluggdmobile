import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { BlockUserButton } from "@/components/BlockUserButton";
import { 
  Inbox, 
  Star, 
  Filter, 
  Reply, 
  ExternalLink, 
  MessageSquare, 
  Mail, 
  Youtube, 
  Instagram,
  Hash,
  Crown,
  Search
} from "lucide-react";

interface InboxMessage {
  id: string;
  provider: string;
  message_id: string | null;
  author_name: string | null;
  author_handle: string | null;
  author_id?: string | null;
  snippet: string | null;
  permalink: string | null;
  thread_id: string | null;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  user_id: string;
}

const PROVIDER_ICONS = {
  youtube: Youtube,
  discord: MessageSquare,
  gmail: Mail,
  instagram: Instagram,
  twitter: Hash
};

const PROVIDER_COLORS = {
  youtube: 'bg-red-500',
  discord: 'bg-indigo-500',
  gmail: 'bg-red-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  twitter: 'bg-black'
};

export const UnifiedInbox = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filters, setFilters] = useState({
    provider: 'all',
    status: 'all',
    search: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [messages, filters]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('unified_inbox')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load inbox messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    // Provider filter
    if (filters.provider !== 'all') {
      filtered = filtered.filter(msg => msg.provider === filters.provider);
    }

    // Status filter
    if (filters.status === 'unread') {
      filtered = filtered.filter(msg => !msg.is_read);
    } else if (filters.status === 'starred') {
      filtered = filtered.filter(msg => msg.is_starred);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(msg => 
        (msg.snippet && msg.snippet.toLowerCase().includes(searchLower)) ||
        (msg.author_name && msg.author_name.toLowerCase().includes(searchLower)) ||
        (msg.author_handle && msg.author_handle.toLowerCase().includes(searchLower))
      );
    }

    setFilteredMessages(filtered);
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('unified_inbox')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (messageId: string, starred: boolean) => {
    try {
      const { error } = await supabase
        .from('unified_inbox')
        .update({ is_starred: starred })
        .eq('id', messageId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, is_starred: starred } : msg
      ));

      toast({
        title: starred ? "Starred" : "Unstarred",
        description: `Message ${starred ? 'added to' : 'removed from'} starred`,
      });
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const handleReply = async (message: InboxMessage) => {
    if (!replyText.trim()) return;

    try {
      let replyUrl = '';
      
      switch (message.provider) {
        case 'youtube':
          // Call YouTube comment reply function
          const { error: youtubeError } = await supabase.functions.invoke('reply-youtube-comment', {
            body: { 
              comment_id: message.message_id,
              reply_text: replyText 
            }
          });
          if (youtubeError) throw youtubeError;
          break;
          
        case 'discord':
          // Call Discord reply function
          const { error: discordError } = await supabase.functions.invoke('reply-discord-message', {
            body: { 
              channel_id: message.thread_id,
              reply_text: replyText,
              original_message_id: message.message_id
            }
          });
          if (discordError) throw discordError;
          break;
          
        case 'gmail':
          // Open Gmail compose window
          replyUrl = `https://mail.google.com/mail/u/0/#inbox/${message.thread_id}`;
          window.open(replyUrl, '_blank');
          break;
          
        default:
          toast({
            title: "Reply Not Available",
            description: `Replies not supported for ${message.provider}`,
            variant: "destructive"
          });
          return;
      }

      if (message.provider !== 'gmail') {
        toast({
          title: "Reply Sent",
          description: `Your reply has been sent via ${message.provider}`,
        });
      }

      setReplyText('');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Reply Failed",
        description: "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    const Icon = PROVIDER_ICONS[provider] || MessageSquare;
    return Icon;
  };

  const getProviderColor = (provider: string) => {
    return PROVIDER_COLORS[provider] || 'bg-gray-500';
  };

  const unreadCount = messages.filter(msg => !msg.is_read).length;
  const starredCount = messages.filter(msg => msg.is_starred).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="w-full h-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            {t('pages.messaging.heading')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{t('pages.messaging.description')}</CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
            </div>

            <Select value={filters.provider} onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('pages.messaging.providerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pages.messaging.providerPlaceholder')}</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="starred">Starred</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4" />
              {starredCount} starred
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-2">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {messages.length === 0 ? 'No messages in your inbox' : 'No messages match your filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => {
            const Icon = getProviderIcon(message.provider);
            const providerColor = getProviderColor(message.provider);
            
            return (
              <Sheet key={message.id}>
                <SheetTrigger asChild>
                  <Card 
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${!message.is_read ? 'border-l-4 border-l-primary' : ''}`}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (!message.is_read) {
                        markAsRead(message.id);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${providerColor} flex-shrink-0`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.author_name}</span>
                            {message.author_handle && (
                              <span className="text-xs text-muted-foreground">@{message.author_handle}</span>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.provider}
                            </Badge>
                            {message.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.snippet || 'No preview available'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(message.created_at).toLocaleDateString()}</span>
                            {!message.is_read && (
                              <Badge variant="secondary" className="text-xs">Unread</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(message.id, !message.is_starred);
                            }}
                          >
                            <Star className={`h-4 w-4 ${message.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                          
                          {message.permalink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(message.permalink, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>

                <SheetContent className="w-full sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${providerColor}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {message.author_name}
                      </span>
                      {message.author_id ? (
                        <BlockUserButton
                          userId={message.author_id}
                          displayName={message.author_name || message.author_handle}
                          size="sm"
                          variant="ghost"
                        />
                      ) : null}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{message.snippet || 'No content available'}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">{message.provider}</Badge>
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>

                    {['youtube', 'discord', 'gmail'].includes(message.provider) && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <Button 
                          onClick={() => handleReply(message)}
                          disabled={!replyText.trim()}
                          className="w-full"
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          {message.provider === 'gmail' ? 'Open in Gmail' : 'Send Reply'}
                        </Button>
                      </div>
                    )}

                    {!['youtube', 'discord', 'gmail'].includes(message.provider) && (
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        Replies not available for {message.provider}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            );
          })
        )}
      </div>
    </div>
  );
};