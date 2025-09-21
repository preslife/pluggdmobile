import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  Filter,
  Download,
  Upload,
  UserPlus,
  Tag,
  MessageSquare,
  TrendingUp,
  Calendar,
  Search,
  MoreVertical,
  Send,
  Eye
} from 'lucide-react';

interface Contact {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  tags: string[];
  total_spent: number;
  last_interaction: string;
  status: 'active' | 'inactive' | 'vip';
  notes?: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  criteria: any;
  contact_count: number;
  color: string;
}

/**
 * EnhancedCRMModule - Customer Relationship Management
 * Manage fans, followers, customers, and email lists
 */
export const EnhancedCRMModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeContacts: 0,
    vipContacts: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    emailSubscribers: 0
  });

  useEffect(() => {
    if (user) {
      fetchCRMData();
    }
  }, [user]);

  const fetchCRMData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch followers
      const { data: followers } = await supabase
        .from('followers')
        .select('*, profiles!followers_follower_id_fkey(username, email, full_name)')
        .eq('following_id', user.id);
      
      // Fetch customers (from orders)
      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .eq('status', 'completed');
      
      // Process contacts
      const contactMap = new Map<string, Contact>();
      
      // Add followers
      followers?.forEach((follower: any) => {
        const profile = follower.profiles;
        if (profile) {
          contactMap.set(follower.follower_id, {
            id: follower.follower_id,
            email: profile.email || '',
            username: profile.username,
            full_name: profile.full_name,
            tags: ['follower'],
            total_spent: 0,
            last_interaction: follower.created_at,
            status: 'active',
            notes: ''
          });
        }
      });
      
      // Add purchase data
      orders?.forEach((order: any) => {
        const existing = contactMap.get(order.user_id);
        if (existing) {
          existing.total_spent += order.total_amount;
          existing.tags.push('customer');
          if (existing.total_spent > 100) {
            existing.status = 'vip';
            existing.tags.push('vip');
          }
        }
      });
      
      const contactList = Array.from(contactMap.values());
      setContacts(contactList);
      
      // Create segments
      const mockSegments: Segment[] = [
        {
          id: '1',
          name: 'All Contacts',
          description: 'Everyone in your CRM',
          criteria: {},
          contact_count: contactList.length,
          color: 'blue'
        },
        {
          id: '2',
          name: 'VIP Customers',
          description: 'High-value customers ($100+)',
          criteria: { min_spent: 100 },
          contact_count: contactList.filter(c => c.status === 'vip').length,
          color: 'gold'
        },
        {
          id: '3',
          name: 'New Followers',
          description: 'Joined in last 30 days',
          criteria: { days_since: 30 },
          contact_count: contactList.filter(c => {
            const daysSince = (Date.now() - new Date(c.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 30;
          }).length,
          color: 'green'
        },
        {
          id: '4',
          name: 'Inactive',
          description: 'No interaction in 90+ days',
          criteria: { inactive_days: 90 },
          contact_count: contactList.filter(c => {
            const daysSince = (Date.now() - new Date(c.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince > 90;
          }).length,
          color: 'gray'
        }
      ];
      
      setSegments(mockSegments);
      
      // Calculate stats
      const totalRevenue = contactList.reduce((sum, c) => sum + c.total_spent, 0);
      const customers = contactList.filter(c => c.tags.includes('customer'));
      
      setStats({
        totalContacts: contactList.length,
        activeContacts: contactList.filter(c => c.status === 'active').length,
        vipContacts: contactList.filter(c => c.status === 'vip').length,
        totalRevenue,
        avgOrderValue: customers.length > 0 ? totalRevenue / customers.length : 0,
        emailSubscribers: contactList.filter(c => c.email).length
      });
      
    } catch (error: any) {
      console.error('Error fetching CRM data:', error);
      toast({
        title: "Error loading CRM data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to email",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Email campaign started",
      description: `Sending to ${selectedContacts.length} contacts`,
    });
  };

  const handleExportContacts = () => {
    // Convert contacts to CSV
    const csv = [
      ['Email', 'Username', 'Name', 'Total Spent', 'Tags', 'Status'],
      ...contacts.map(c => [
        c.email,
        c.username || '',
        c.full_name || '',
        c.total_spent.toString(),
        c.tags.join(';'),
        c.status
      ])
    ].map(row => row.join(',')).join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    
    toast({
      title: "Contacts exported",
      description: `${contacts.length} contacts exported to CSV`,
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === '' || 
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = filterTag === 'all' || contact.tags.includes(filterTag);
    
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">CRM & Audience</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary rounded" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CRM & Audience</h1>
          <p className="text-muted-foreground">Manage your fans, followers, and customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportContacts}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VIP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vipContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Email Subs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailSubscribers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="campaigns">Email Campaigns</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Contact List</CardTitle>
                  <CardDescription>All your fans, followers, and customers</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      <SelectItem value="follower">Followers</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedContacts.length > 0 && (
                    <Button onClick={handleBulkEmail}>
                      <Send className="w-4 h-4 mr-2" />
                      Email ({selectedContacts.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No contacts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(contact.username || contact.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{contact.full_name || contact.username || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                          {contact.tags.map(tag => (
                            <Badge key={tag} variant={tag === 'vip' ? 'default' : 'secondary'} className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${contact.total_spent.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Last: {new Date(contact.last_interaction).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audience Segments</CardTitle>
              <CardDescription>Group contacts for targeted campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {segments.map((segment) => (
                  <Card key={segment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{segment.name}</CardTitle>
                          <CardDescription>{segment.description}</CardDescription>
                        </div>
                        <Badge>{segment.contact_count} contacts</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Create and manage email marketing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Email campaign builder coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Design beautiful emails and track engagement
                </p>
                <Button className="mt-4">
                  <Mail className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Automation</CardTitle>
              <CardDescription>Set up automated workflows and sequences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Automation workflows coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Welcome series, abandoned cart, and more
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCRMModule;
