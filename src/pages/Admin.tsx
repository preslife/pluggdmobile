import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMetadata } from "@/hooks/usePageMetadata";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EnhancedBadge } from "@/components/ui/badge-enhanced";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Users, Package, Music, ShoppingCart, FileText, Eye, BookOpen, AudioWaveform, Upload, Plug, Mail, Download, Globe, ExternalLink, AlertCircle, Shield, DollarSign, ShoppingBag, UserCheck, HelpCircle, Video, Package2, Music2, Trophy, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedAdminCourseManager } from "@/components/EnhancedAdminCourseManager";
import { DirectorySubmissions } from "@/components/DirectorySubmissions";
import { AdminProductManager } from "@/components/AdminProductManager";
import { AdminArtistManager } from "@/components/AdminArtistManager";
import { AdminVideoManager } from "@/components/AdminVideoManager";
import { AdminBlogManager } from "@/components/AdminBlogManager";
import { FileUpload } from "@/components/FileUpload";
import { PaymentButton } from "@/components/PaymentButton";
import { MultiTrackUpload, Track } from "@/components/MultiTrackUpload";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";
import { IntegrationsHealthCheck } from "@/components/IntegrationsHealthCheck";
import { AdminVerificationTab } from "@/components/AdminVerificationTab";
import { AdminAnalyticsTiles } from "@/components/AdminAnalyticsTiles";
import { AdminContestManager } from "@/components/AdminContestManager";
const Admin = () => {
  usePageMetadata({
    title: "Admin Control Center — Pluggd",
    description:
      "Moderate catalog submissions, manage creators, and oversee payouts, products, and platform operations across Pluggd.",
    path: "/admin",
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for different sections
  const [releases, setReleases] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [beats, setBeats] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [mailingList, setMailingList] = useState([]);
  const [releaseDrafts, setReleaseDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftFilter, setDraftFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [selectedDraftTracks, setSelectedDraftTracks] = useState<any[]>([]);
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);

  // Form states
  const [releaseForm, setReleaseForm] = useState({
    title: '', artist: '', featured_artist: '', description: '', release_date: '', cover_art_url: '',
    spotify_url: '', apple_music_url: '', youtube_url: '', soundcloud_url: '',
    genre: '', is_featured: false, spotlight: false, download_url: '', download_price: 0, release_type: 'Single', preview_url: ''
  });

  const [tracks, setTracks] = useState<Track[]>([]);

  const [productForm, setProductForm] = useState({
    title: '', description: '', price: '', product_type: '',
    image_url: '', download_url: '', stock_quantity: '', tags: ''
  });

  const [beatForm, setBeatForm] = useState({
    title: '', description: '', genre: '', bpm: '', key: '',
    audio_url: '', image_url: '', tags: '', is_published: false, is_featured: false, producer_name: '',
    stems_url: '', selectedLicenses: ['basic_lease'], licensePrices: { basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }
  });

  const [editingRelease, setEditingRelease] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingBeat, setEditingBeat] = useState<any>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, draftFilter]);

  const fetchDraftTracks = async (releaseId: string) => {
    try {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', releaseId)
        .order('track_number');
      
      if (error) throw error;
      setSelectedDraftTracks(tracks || []);
    } catch (error: any) {
      console.error('Error fetching tracks:', error);
      setSelectedDraftTracks([]);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
         .maybeSingle();

      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const [releasesRes, productsRes, ordersRes, profilesRes, bookingsRes, subscriptionsRes, mailingListRes] = await Promise.all([
        supabase.from('releases').select('*').order('created_at', { ascending: false }),
        supabase.from('store_products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, store_products(*))').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select(`
          *,
          client:profiles!bookings_client_user_id_fkey(username, full_name, avatar_url),
          professional:profiles!bookings_professional_user_id_fkey(username, full_name, avatar_url)
        `).order('created_at', { ascending: false }),
        supabase.from('user_subscriptions').select(`
          *,
          profiles(username, full_name, avatar_url)
        `).order('created_at', { ascending: false }),
        supabase.from('mailing_list').select('*').order('created_at', { ascending: false })
      ]);

      // Fetch beats separately and then add profile data
      const beatsRes = await supabase.from('beats').select('*').order('created_at', { ascending: false });
      
      let beatsWithProfiles = [];
      if (beatsRes.data) {
        // Get unique user IDs from beats
        const userIds = [...new Set(beatsRes.data.map(beat => beat.user_id))];
        
        // Fetch profiles for these users if we have user IDs
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, username, full_name')
            .in('user_id', userIds);

          // Combine beats with profile data
          beatsWithProfiles = beatsRes.data.map(beat => ({
            ...beat,
            profiles: profilesData?.find(profile => profile.user_id === beat.user_id) || null
          }));
        } else {
          beatsWithProfiles = beatsRes.data;
        }
      }

      setReleases(releasesRes.data || []);
      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
      setUsers(profilesRes.data || []);
      setBookings(bookingsRes.data || []);
      setBeats(beatsWithProfiles);
      setSubscriptions(subscriptionsRes.data || []);
      setMailingList(mailingListRes.data || []);

      // Fetch releases for admin review based on current filter
      setDraftsLoading(true);
      let query = supabase
        .from('releases')
        .select('*');
      
      if (draftFilter === 'all') {
        query = query.in('status', ['submitted', 'approved', 'rejected']);
      } else {
        query = query.eq('status', draftFilter);
      }
      
      const { data: draftsData } = await query.order('updated_at', { ascending: false });
      setReleaseDrafts(draftsData || []);
      setDraftsLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let releaseId = editingRelease?.id;
      
      if (editingRelease) {
        const { error } = await supabase
          .from('releases')
          .update(releaseForm)
          .eq('id', editingRelease.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('releases')
          .insert([releaseForm])
          .select()
           .maybeSingle();
         if (error) throw error;
         if (!data) throw new Error('Release creation failed');
         releaseId = data.id;
      }

      // Save tracks for EP and Album releases
      if ((releaseForm.release_type === 'EP' || releaseForm.release_type === 'Album') && tracks.length > 0) {
        // First delete existing tracks if editing
        if (editingRelease) {
          await supabase
            .from('tracks')
            .delete()
            .eq('release_id', releaseId);
        }

        // Insert new tracks
        const tracksToInsert = tracks.map(track => ({
          ...track,
          release_id: releaseId
        }));

        const { error: tracksError } = await supabase
          .from('tracks')
          .insert(tracksToInsert);

        if (tracksError) throw tracksError;
      }

      toast({ 
        title: "Success", 
        description: editingRelease ? "Release updated successfully" : "Release created successfully"
      });
      
      setReleaseForm({
        title: '', artist: '', featured_artist: '', description: '', release_date: '', cover_art_url: '',
        spotify_url: '', apple_music_url: '', youtube_url: '', soundcloud_url: '',
        genre: '', is_featured: false, spotlight: false, download_url: '', download_price: 0, release_type: 'Single', preview_url: ''
      });
      setTracks([]);
      setEditingRelease(null);
      setReleaseDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save release",
        variant: "destructive",
      });
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock_quantity: productForm.stock_quantity ? parseInt(productForm.stock_quantity) : null,
        tags: productForm.tags ? productForm.tags.split(',').map(tag => tag.trim()) : []
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('store_products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('store_products')
          .insert([productData]);
        if (error) throw error;
        toast({ title: "Success", description: "Product created successfully" });
      }
      
      setProductForm({
        title: '', description: '', price: '', product_type: '',
        image_url: '', download_url: '', stock_quantity: '', tags: ''
      });
      setEditingProduct(null);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const deleteRelease = async (id: string) => {
    try {
      const { error } = await supabase
        .from('releases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Release deleted successfully" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete release",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: "Success", description: "Order status updated" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
      if (error) throw error;
      toast({ title: "Success", description: "Booking status updated" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const handleBeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const beatData = {
        title: beatForm.title,
        description: beatForm.description,
        genre: beatForm.genre,
        bpm: beatForm.bpm ? parseInt(beatForm.bpm) : null,
        key: beatForm.key,
        price: (() => {
          const enabledLicenses = beatForm.selectedLicenses;
          if (enabledLicenses.length === 0) return 0;
          return Math.min(...enabledLicenses.map(type => 
            beatForm.licensePrices[type] || 
            ({ basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }[type] || 0)
          ));
        })(),
        audio_url: beatForm.audio_url,
        image_url: beatForm.image_url,
        tags: beatForm.tags ? beatForm.tags.split(',').map(tag => tag.trim()) : [],
        is_published: beatForm.is_published,
        is_featured: beatForm.is_featured,
        uploaded_by_admin: true,
        producer_name: beatForm.producer_name || 'Internal Producer',
        user_id: user!.id,
        stems_url: beatForm.stems_url
      };

      if (editingBeat) {
        const { error } = await supabase
          .from('beats')
          .update(beatData)
          .eq('id', editingBeat.id);
        if (error) throw error;
        toast({ title: "Success", description: "Beat updated successfully" });
      } else {
        // Insert beat first
        const { data: newBeat, error: beatError } = await supabase
          .from('beats')
          .insert([beatData])
          .select()
          .maybeSingle();
        
         if (beatError) throw beatError;

         if (!newBeat) throw new Error('Beat creation failed');

        // Add selected licensing options
        const licensingPromises = beatForm.selectedLicenses.map(licenseType => 
          supabase
            .from('licensing_options')
            .insert({
              beat_id: newBeat.id,
              license_type: licenseType,
              price: beatForm.licensePrices[licenseType] || 25,
              is_available: true
            })
        );

        const licensingResults = await Promise.all(licensingPromises);
        const licensingError = licensingResults.find(result => result.error);
        if (licensingError?.error) throw licensingError.error;
        toast({ title: "Success", description: "Beat created successfully" });
      }
      
      setBeatForm({
        title: '', description: '', genre: '', bpm: '', key: '',
        audio_url: '', image_url: '', tags: '', is_published: false, is_featured: false, producer_name: '',
        stems_url: '', selectedLicenses: ['basic_lease'], licensePrices: { basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }
      });
      setEditingBeat(null);
      setBeatDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save beat",
        variant: "destructive",
      });
    }
  };

  const deleteBeat = async (id: string) => {
    try {
      const { error } = await supabase
        .from('beats')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Beat deleted successfully" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete beat",
        variant: "destructive",
      });
    }
  };

  const updateSubscriptionTier = async (userId: string, tier: 'free' | 'creator' | 'pro') => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ tier })
        .eq('user_id', userId);
      if (error) throw error;
      toast({ title: "Success", description: "Subscription tier updated" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription tier",
        variant: "destructive",
      });
    }
  };

  const cancelSubscription = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId);
      if (error) throw error;
      toast({ title: "Success", description: "Subscription cancelled" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Please sign in to access the admin panel.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You don't have administrator privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="releases" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1">
            <TabsTrigger value="releases" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Releases
            </TabsTrigger>
            <TabsTrigger value="beats" className="flex items-center gap-2">
              <AudioWaveform className="w-4 h-4" />
              Beats
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="directory" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Directory
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="site-admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Site Admin
            </TabsTrigger>
            <TabsTrigger value="enhanced-tools" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Enhanced
            </TabsTrigger>
            <TabsTrigger value="contests" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Contests
            </TabsTrigger>
          </TabsList>

          {/* Releases Tab */}
          <TabsContent value="releases" className="space-y-6">
            {/* Nested Tabs for Releases */}
            <Tabs defaultValue="manage" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Manage Releases
                </TabsTrigger>
                <TabsTrigger value="submissions" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Review Submissions
                </TabsTrigger>
              </TabsList>

              {/* Manage Releases Section */}
              <TabsContent value="manage" className="space-y-6">
                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center justify-between">
                       Create & Manage Releases
                         <Button onClick={() => {
                           setEditingRelease(null);
                            setReleaseForm({
                              title: '', artist: '', featured_artist: '', description: '', release_date: '', cover_art_url: '',
                              spotify_url: '', apple_music_url: '', youtube_url: '', soundcloud_url: '',
                              genre: '', is_featured: false, spotlight: false, download_url: '', download_price: 0, release_type: 'Single', preview_url: ''
                            });
                           setTracks([]);
                           setReleaseDialogOpen(true);
                         }}>
                         <Plus className="w-4 h-4 mr-2" />
                         Add Release
                       </Button>
                     </CardTitle>
                   </CardHeader>
               <CardContent>
                 <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
                   <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                     <DialogHeader>
                       <DialogTitle>{editingRelease ? 'Edit Release' : 'Add New Release'}</DialogTitle>
                     </DialogHeader>
                     <form onSubmit={handleReleaseSubmit} className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="title">Title</Label>
                           <Input
                             id="title"
                             value={releaseForm.title}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, title: e.target.value }))}
                             required
                           />
                         </div>
                         <div>
                           <Label htmlFor="artist">Artist</Label>
                           <Input
                             id="artist"
                             value={releaseForm.artist}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, artist: e.target.value }))}
                             required
                           />
                         </div>
                       </div>
                       
                       <div>
                         <Label htmlFor="description">Description</Label>
                         <Textarea
                           id="description"
                           value={releaseForm.description}
                           onChange={(e) => setReleaseForm(prev => ({ ...prev, description: e.target.value }))}
                         />
                       </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="release_date">Release Date</Label>
                            <Input
                              id="release_date"
                              type="date"
                              value={releaseForm.release_date}
                              onChange={(e) => setReleaseForm(prev => ({ ...prev, release_date: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="release_type">Release Type</Label>
                             <Select
                               value={releaseForm.release_type}
                               onValueChange={(value) => {
                                 setReleaseForm(prev => ({ ...prev, release_type: value }));
                                 // Clear tracks if switching to Single
                                 if (value === 'Single') {
                                   setTracks([]);
                                 }
                               }}
                             >
                              <SelectTrigger>
                                <SelectValue placeholder="Select release type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Single">Single</SelectItem>
                                <SelectItem value="EP">EP</SelectItem>
                                <SelectItem value="Album">Album</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="genre">Genre</Label>
                          <Input
                            id="genre"
                            value={releaseForm.genre}
                            onChange={(e) => setReleaseForm(prev => ({ ...prev, genre: e.target.value }))}
                          />
                        </div>

                       <div>
                         <Label htmlFor="featured_artist">Featured Artist (Optional)</Label>
                         <Input
                           id="featured_artist"
                           value={releaseForm.featured_artist}
                           onChange={(e) => setReleaseForm(prev => ({ ...prev, featured_artist: e.target.value }))}
                           placeholder="Featuring another artist"
                         />
                       </div>

                        <div>
                          <Label>Cover Art Upload</Label>
                           <FileUpload
                             accept="image/*"
                             bucketName="beat-artwork"
                             maxSizeMB={10}
                             onUpload={(url, fileName) => {
                               console.log('Upload callback called with URL:', url);
                               setReleaseForm(prev => ({ ...prev, cover_art_url: url }));
                             }}
                           />
                           {/* Debug: Show current cover_art_url value */}
                           {releaseForm.cover_art_url && (
                             <p className="text-xs text-muted-foreground mt-1">Current URL: {releaseForm.cover_art_url}</p>
                           )}
                          {releaseForm.cover_art_url && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-4">
                                <img 
                                  src={releaseForm.cover_art_url} 
                                  alt="Cover art preview" 
                                  className="w-20 h-20 object-cover rounded-lg border"
                                />
                                <div className="flex-1">
                                  <Label htmlFor="cover_art_url">Cover Art URL</Label>
                                  <Input
                                    id="cover_art_url"
                                    value={releaseForm.cover_art_url}
                                    onChange={(e) => setReleaseForm(prev => ({ ...prev, cover_art_url: e.target.value }))}
                                    placeholder="Upload image or paste URL"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Audio Upload Section - Conditional based on release type */}
                        {releaseForm.release_type === 'Single' ? (
                          <div>
                            <Label>Audio File Upload</Label>
                            <FileUpload
                              accept="audio/*"
                              bucketName="audio-files"
                              maxSizeMB={80}
                              onUpload={(url, fileName) => {
                                console.log('Audio upload successful:', fileName, 'Size limit: 80MB');
                                setReleaseForm(prev => ({ ...prev, download_url: url }));
                              }}
                            />
                            {releaseForm.download_url && (
                              <div className="mt-2">
                                <Label htmlFor="download_url">Or paste Audio File URL</Label>
                                <Input
                                  id="download_url"
                                  value={releaseForm.download_url}
                                  onChange={(e) => setReleaseForm(prev => ({ ...prev, download_url: e.target.value }))}
                                  placeholder="URL for purchasing/downloading"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <MultiTrackUpload
                            tracks={tracks}
                            onTracksChange={setTracks}
                            releaseType={releaseForm.release_type}
                          />
                         )}

                        {/* Preview Audio Upload Section */}
                        <div>
                          <Label>Preview Audio Upload (30 seconds max)</Label>
                          <FileUpload
                            accept="audio/*"
                            bucketName="audio-files"
                            maxSizeMB={5}
                            onUpload={(url, fileName) => {
                              console.log('Preview audio upload successful:', fileName);
                              setReleaseForm(prev => ({ ...prev, preview_url: url }));
                            }}
                          />
                          {releaseForm.preview_url && (
                            <div className="mt-2">
                              <Label htmlFor="preview_url">Preview Audio URL</Label>
                              <Input
                                id="preview_url"
                                value={releaseForm.preview_url}
                                onChange={(e) => setReleaseForm(prev => ({ ...prev, preview_url: e.target.value }))}
                                placeholder="URL for 30-second preview audio"
                              />
                              <audio controls className="mt-2 w-full">
                                <source src={releaseForm.preview_url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="download_price">Download Price (GBP)</Label>
                          <Input
                            id="download_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={releaseForm.download_price}
                            onChange={(e) => setReleaseForm(prev => ({ ...prev, download_price: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="spotify_url">Spotify URL</Label>
                           <Input
                             id="spotify_url"
                             value={releaseForm.spotify_url}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, spotify_url: e.target.value }))}
                           />
                         </div>
                         <div>
                           <Label htmlFor="apple_music_url">Apple Music URL</Label>
                           <Input
                             id="apple_music_url"
                             value={releaseForm.apple_music_url}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, apple_music_url: e.target.value }))}
                           />
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="youtube_url">YouTube URL</Label>
                           <Input
                             id="youtube_url"
                             value={releaseForm.youtube_url}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, youtube_url: e.target.value }))}
                           />
                         </div>
                         <div>
                           <Label htmlFor="soundcloud_url">SoundCloud URL</Label>
                           <Input
                             id="soundcloud_url"
                             value={releaseForm.soundcloud_url}
                             onChange={(e) => setReleaseForm(prev => ({ ...prev, soundcloud_url: e.target.value }))}
                           />
                         </div>
                       </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is_featured"
                              checked={releaseForm.is_featured}
                              onCheckedChange={(checked) => setReleaseForm(prev => ({ ...prev, is_featured: checked }))}
                            />
                            <Label htmlFor="is_featured">Featured Release</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="spotlight"
                              checked={releaseForm.spotlight}
                              onCheckedChange={(checked) => setReleaseForm(prev => ({ ...prev, spotlight: checked }))}
                            />
                            <Label htmlFor="spotlight">Spotlight</Label>
                          </div>
                        </div>

                       <Button type="submit" className="w-full">
                         {editingRelease ? 'Update Release' : 'Create Release'}
                       </Button>
                     </form>
                   </DialogContent>
                 </Dialog>
                <Table>
                   <TableHeader>
                     <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead>Release Date</TableHead>
                         <TableHead>Genre</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {releases.map((release: any) => (
                       <TableRow key={release.id}>
                         <TableCell>{release.title}</TableCell>
                         <TableCell>{release.artist.charAt(0).toUpperCase() + release.artist.slice(1).toLowerCase()}</TableCell>
                         <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
                         <TableCell>{release.genre}</TableCell>
                           <TableCell>
                             <div className="flex gap-1">
                                {release.is_featured && <EnhancedBadge variant="secondary">Featured</EnhancedBadge>}
                                {release.spotlight && <EnhancedBadge variant="default">Spotlight</EnhancedBadge>}
                             </div>
                           </TableCell>
                         <TableCell>
                           <div className="flex gap-2">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={async () => {
                                   setEditingRelease(release);
                                     setReleaseForm({
                                       title: release.title,
                                       artist: release.artist,
                                       featured_artist: release.featured_artist || '',
                                       description: release.description || '',
                                       release_date: release.release_date,
                                       cover_art_url: release.cover_art_url || '',
                                       spotify_url: release.spotify_url || '',
                                       apple_music_url: release.apple_music_url || '',
                                       youtube_url: release.youtube_url || '',
                                       soundcloud_url: release.soundcloud_url || '',
                                       genre: release.genre || '',
                                       is_featured: release.is_featured,
                                       spotlight: release.spotlight || false,
                                       download_url: release.download_url || '',
                                       download_price: release.download_price || 0,
                                       release_type: release.release_type || 'Single',
                                       preview_url: release.preview_url || ''
                                     });
                                   
                                   // Load tracks if it's an EP or Album
                                   if (release.release_type === 'EP' || release.release_type === 'Album') {
                                     const { data: tracksData } = await supabase
                                       .from('tracks')
                                       .select('*')
                                       .eq('release_id', release.id)
                                       .order('track_number');
                                     
                                     setTracks(tracksData || []);
                                   } else {
                                     setTracks([]);
                                   }
                                   
                                   setReleaseDialogOpen(true);
                                 }}
                               >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               variant="destructive"
                               size="sm"
                               onClick={() => deleteRelease(release.id)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           </TabsContent>

           {/* Review Submissions Section */}
           <TabsContent value="submissions" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center justify-between">
                   Release Submissions
                   <div className="flex items-center gap-2">
                     <span className="text-sm text-muted-foreground">Filter</span>
                     <Select value={draftFilter} onValueChange={(v) => setDraftFilter(v as any)}>
                       <SelectTrigger className="w-[160px]">
                         <SelectValue placeholder="Status" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="submitted">Submitted</SelectItem>
                         <SelectItem value="approved">Approved</SelectItem>
                         <SelectItem value="rejected">Rejected</SelectItem>
                         <SelectItem value="all">All</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {draftsLoading ? (
                   <div className="py-8 text-center text-muted-foreground">Loading submissions...</div>
                 ) : (
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Title</TableHead>
                         <TableHead>Artist</TableHead>
                         <TableHead>Type</TableHead>
                         <TableHead>Genre</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Updated</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {(releaseDrafts || [])
                         .map((d: any) => (
                           <TableRow key={d.id}>
                             <TableCell className="font-medium">{d.title}</TableCell>
                             <TableCell>{d.artist || '—'}</TableCell>
                             <TableCell><EnhancedBadge variant="outline">{d.release_type}</EnhancedBadge></TableCell>
                             <TableCell>{d.genre || '—'}</TableCell>
                             <TableCell>
                                <EnhancedBadge variant={d.status === 'submitted' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {d.status}
                                </EnhancedBadge>
                             </TableCell>
                             <TableCell>{new Date(d.updated_at).toLocaleDateString()}</TableCell>
                             <TableCell className="text-right space-x-2">
                               <Dialog>
                                 <DialogTrigger asChild>
                                   <Button size="sm" variant="outline" onClick={() => fetchDraftTracks(d.id)}>Details</Button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-xl">
                                   <DialogHeader>
                                     <DialogTitle>Release details</DialogTitle>
                                   </DialogHeader>
                                   <div className="space-y-4">
                                     {d.cover_art_url && (
                                       <img src={d.cover_art_url} alt={`${d.title} cover`} className="w-full rounded-md" />
                                     )}
                                     <div className="grid grid-cols-2 gap-3 text-sm">
                                       <div>
                                         <div className="text-muted-foreground">Title</div>
                                         <div className="font-medium">{d.title}</div>
                                       </div>
                                       <div>
                                         <div className="text-muted-foreground">Artist</div>
                                         <div className="font-medium">{d.artist || '—'}</div>
                                       </div>
                                       <div>
                                         <div className="text-muted-foreground">Type</div>
                                         <div className="font-medium">{d.release_type}</div>
                                       </div>
                                       <div>
                                         <div className="text-muted-foreground">Genre</div>
                                         <div className="font-medium">{d.genre || '—'}</div>
                                       </div>
                                       <div>
                                         <div className="text-muted-foreground">Price</div>
                                         <div className="font-medium">${(d.price || 0).toFixed(2)}</div>
                                       </div>
                                     </div>
                                     {d.description && (
                                       <p className="text-sm whitespace-pre-wrap">{d.description}</p>
                                     )}
                                     {(d.preview_url || d.download_url) && (
                                       <div className="mt-3">
                                         <div className="text-sm font-medium mb-2">🎵 Audio Preview:</div>
                                         <div className="text-xs mb-2">
                                           <a href={d.preview_url || d.download_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                             Test direct audio link (right-click to check if accessible)
                                           </a>
                                         </div>
                                         <audio controls className="w-full" onError={() => console.error('Audio failed to load:', d.preview_url || d.download_url)}>
                                           <source src={d.preview_url || d.download_url} type="audio/wav" />
                                           <source src={d.preview_url || d.download_url} type="audio/mpeg" />
                                           <source src={d.preview_url || d.download_url} type="audio/mp3" />
                                           Your browser does not support the audio element.
                                         </audio>
                                         <div className="text-xs mt-1 text-muted-foreground">
                                           If audio doesn't play, the storage bucket may need public access configured.
                                         </div>
                                       </div>
                                     )}
                                     {d.download_url && (
                                       <a href={d.download_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Download file</a>
                                     )}
                                     
                                     {/* Track Listing */}
                                     {selectedDraftTracks.length > 0 && (
                                       <div className="mt-4">
                                         <div className="text-sm font-medium mb-2">📁 Track List:</div>
                                         <div className="space-y-2">
                                           {selectedDraftTracks.map((track) => (
                                             <div key={track.id} className="flex items-center justify-between p-2 border rounded">
                                               <div>
                                                 <div className="font-medium text-sm">{track.track_number}. {track.title}</div>
                                                 {track.duration && (
                                                   <div className="text-xs text-muted-foreground">
                                                     {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                                   </div>
                                                 )}
                                               </div>
                                               {track.audio_url && (
                                                 <audio controls className="w-32">
                                                   <source src={track.audio_url} type="audio/wav" />
                                                   <source src={track.audio_url} type="audio/mpeg" />
                                                   <source src={track.audio_url} type="audio/mp3" />
                                                 </audio>
                                               )}
                                             </div>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                 </DialogContent>
                               </Dialog>
                               <Button
                                 size="sm"
                                 disabled={d.status !== 'submitted'}
                                 onClick={async () => {
                                   try {
                                     // Simply update the status to approved and set release date
                                     const { error } = await supabase
                                       .from('releases')
                                       .update({
                                         status: 'live',
                                         approved: true,
                                         release_date: new Date().toISOString().slice(0, 10),
                                       })
                                       .eq('id', d.id);
                                     if (error) throw error;
                                     
                                     // Create notification for creator
                                     await supabase
                                       .from('notifications')
                                       .insert({
                                         user_id: d.user_id,
                                         title: 'Release Approved!',
                                         message: `Your release "${d.title}" is live. Tap to view.`,
                                         type: 'success',
                                         related_id: d.id,
                                         related_type: 'release'
                                       });
                                     
                                     // Award XP to creator for release approval (non-blocking)
                                     try {
                                       await supabase.rpc('award_quest_xp', { p_user_id: d.user_id, p_xp_amount: 25 });
                                       await supabase.from('notifications').insert({
                                         user_id: d.user_id,
                                         title: 'XP Awarded',
                                         message: 'You earned 25 XP for your release going live!',
                                         type: 'success',
                                         related_id: d.id,
                                         related_type: 'release'
                                       });
                                     } catch {}
                                     
                                     toast({ title: 'Release approved', description: 'Published to Label.', action: <ToastAction altText="View live" onClick={() => navigate(`/release/${d.id}`)}>View live</ToastAction> });
                                     fetchAllData();
                                   } catch (e: any) {
                                     toast({ title: 'Error', description: e.message, variant: 'destructive' });
                                   }
                                 }}
                               >
                                 Approve
                               </Button>
                               <Button
                                 size="sm"
                                 variant="destructive"
                                 onClick={async () => {
                                   try {
                                     const reason = window.prompt('Enter rejection reason (optional):');
                                     const { error } = await supabase
                                       .from('releases')
                                       .update({ status: 'rejected', moderation_notes: reason && reason.trim() ? reason.trim() : null })
                                       .eq('id', d.id);
                                     if (error) throw error;
                                     
                                     // Create notification for creator
                                     await supabase
                                       .from('notifications')
                                       .insert({
                                         user_id: d.user_id,
                                         title: 'Release Rejected',
                                         message: `Your release "${d.title}" has been rejected. ${reason ? `Reason: ${reason}` : 'Please review and resubmit.'}`,
                                         type: 'error',
                                         related_id: d.id,
                                         related_type: 'release'
                                       });
                                     
                                     toast({ title: 'Draft rejected', description: reason ? 'Reason saved for creator' : undefined });
                                     fetchAllData();
                                   } catch (e: any) {
                                     toast({ title: 'Error', description: e.message, variant: 'destructive' });
                                   }
                                 }}
                               >
                                 Reject
                               </Button>
                             </TableCell>
                           </TableRow>
                         ))}
                     </TableBody>
                   </Table>
                 )}
               </CardContent>
             </Card>
           </TabsContent>

           </Tabs>
          </TabsContent>

          {/* Beats Tab */}
          <TabsContent value="beats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Manage Beats
                  <Button onClick={() => {
                    setEditingBeat(null);
                     setBeatForm({
                        title: '', description: '', genre: '', bpm: '', key: '',
                        audio_url: '', image_url: '', tags: '', is_published: false, is_featured: false, producer_name: '',
                        stems_url: '', selectedLicenses: ['basic_lease'], licensePrices: { basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }
                      });
                    setBeatDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Beat
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={beatDialogOpen} onOpenChange={setBeatDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingBeat ? 'Edit Beat' : 'Add New Beat'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBeatSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="beat_title">Title</Label>
                          <Input
                            id="beat_title"
                            value={beatForm.title}
                            onChange={(e) => setBeatForm(prev => ({ ...prev, title: e.target.value }))}
                            required
                            placeholder="Enter beat title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="beat_genre">Genre</Label>
                          <Select value={beatForm.genre} onValueChange={(value) => setBeatForm(prev => ({ ...prev, genre: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select genre" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                              <SelectItem value="Trap">Trap</SelectItem>
                              <SelectItem value="R&B">R&B</SelectItem>
                              <SelectItem value="Pop">Pop</SelectItem>
                              <SelectItem value="Electronic">Electronic</SelectItem>
                              <SelectItem value="Drill">Drill</SelectItem>
                              <SelectItem value="Afrobeat">Afrobeat</SelectItem>
                              <SelectItem value="Jazz">Jazz</SelectItem>
                              <SelectItem value="Rock">Rock</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                       <div>
                         <Label htmlFor="beat_producer_name">Producer Name (for attribution)</Label>
                         <Input
                           id="beat_producer_name"
                           value={beatForm.producer_name}
                           onChange={(e) => setBeatForm(prev => ({ ...prev, producer_name: e.target.value }))}
                           placeholder="Enter producer name for attribution"
                           required
                         />
                         <p className="text-xs text-muted-foreground mt-1">
                           This name will be displayed as the producer of this beat (100% platform revenue)
                         </p>
                       </div>

                       <div>
                         <Label htmlFor="beat_description">Description</Label>
                         <Textarea
                           id="beat_description"
                           value={beatForm.description}
                           onChange={(e) => setBeatForm(prev => ({ ...prev, description: e.target.value }))}
                           placeholder="Describe the beat style, mood, or inspiration"
                           rows={3}
                         />
                       </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="beat_bpm">BPM</Label>
                          <Input
                            id="beat_bpm"
                            type="number"
                            value={beatForm.bpm}
                            onChange={(e) => setBeatForm(prev => ({ ...prev, bpm: e.target.value }))}
                            placeholder="120"
                            min="60"
                            max="200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="beat_key">Key</Label>
                          <Select value={beatForm.key} onValueChange={(value) => setBeatForm(prev => ({ ...prev, key: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select key" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="C#">C#</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                              <SelectItem value="D#">D#</SelectItem>
                              <SelectItem value="E">E</SelectItem>
                              <SelectItem value="F">F</SelectItem>
                              <SelectItem value="F#">F#</SelectItem>
                              <SelectItem value="G">G</SelectItem>
                              <SelectItem value="G#">G#</SelectItem>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="A#">A#</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="p-4 bg-muted/50 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium">Starting Price</Label>
                              <p className="text-xs text-muted-foreground">
                                Auto-calculated from selected licenses
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                ${(() => {
                                  const enabledLicenses = beatForm.selectedLicenses;
                                  if (enabledLicenses.length === 0) return 0;
                                  return Math.min(...enabledLicenses.map(type => 
                                    beatForm.licensePrices[type] || 
                                    ({ basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }[type] || 0)
                                  ));
                                })()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(() => {
                                  const enabledLicenses = beatForm.selectedLicenses;
                                  if (enabledLicenses.length === 0) return 'No licenses selected';
                                  const licenseNames = { 
                                    basic_lease: 'Basic Lease', 
                                    premium_lease: 'Premium Lease', 
                                    unlimited_lease: 'Unlimited Lease', 
                                    exclusive_rights: 'Exclusive Rights' 
                                  };
                                  const sortedLicenses = enabledLicenses.sort((a, b) => {
                                    const priceA = beatForm.licensePrices[a] || ({ basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }[a] || 0);
                                    const priceB = beatForm.licensePrices[b] || ({ basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }[b] || 0);
                                    return priceA - priceB;
                                  });
                                  return licenseNames[sortedLicenses[0]];
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Beat Audio Upload</Label>
                        <FileUpload
                          accept="audio/*"
                          bucketName="audio-files"
                          maxSizeMB={100}
                          onUpload={(url, fileName) => {
                            setBeatForm(prev => ({ ...prev, audio_url: url }));
                          }}
                        />
                        {beatForm.audio_url && (
                          <div className="mt-2">
                            <Label htmlFor="beat_audio_url">Audio URL</Label>
                            <Input
                              id="beat_audio_url"
                              value={beatForm.audio_url}
                              onChange={(e) => setBeatForm(prev => ({ ...prev, audio_url: e.target.value }))}
                              placeholder="Audio file URL"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Beat Artwork Upload</Label>
                        <FileUpload
                          accept="image/*"
                          bucketName="beat-artwork"
                          maxSizeMB={10}
                          onUpload={(url, fileName) => {
                            setBeatForm(prev => ({ ...prev, image_url: url }));
                          }}
                        />
                        {beatForm.image_url && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-4">
                              <img 
                                src={beatForm.image_url} 
                                alt="Beat artwork preview" 
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                              <div className="flex-1">
                                <Label htmlFor="beat_image_url">Artwork URL</Label>
                                <Input
                                  id="beat_image_url"
                                  value={beatForm.image_url}
                                  onChange={(e) => setBeatForm(prev => ({ ...prev, image_url: e.target.value }))}
                                  placeholder="Beat artwork URL"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="beat_tags">Tags (comma separated)</Label>
                        <Input
                          id="beat_tags"
                          value={beatForm.tags}
                          onChange={(e) => setBeatForm(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="trap, dark, 808, melodic"
                        />
                      </div>

                      {/* License Options */}
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold">License Options</Label>
                        <div className="grid gap-4">
                          {[
                            { type: 'basic_lease', title: 'Basic Lease', defaultPrice: 25 },
                            { type: 'premium_lease', title: 'Premium Lease', defaultPrice: 50 },
                            { type: 'unlimited_lease', title: 'Unlimited Lease', defaultPrice: 100 },
                            { type: 'exclusive_rights', title: 'Exclusive Rights', defaultPrice: 500 }
                          ].map((license) => (
                            <div key={license.type} className="flex items-center space-x-4 p-3 border rounded">
                              <Switch
                                id={`license-${license.type}`}
                                checked={beatForm.selectedLicenses.includes(license.type)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setBeatForm(prev => ({
                                      ...prev,
                                      selectedLicenses: [...prev.selectedLicenses, license.type]
                                    }));
                                  } else {
                                    setBeatForm(prev => ({
                                      ...prev,
                                      selectedLicenses: prev.selectedLicenses.filter(l => l !== license.type)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`license-${license.type}`} className="flex-1">
                                {license.title}
                              </Label>
                              {beatForm.selectedLicenses.includes(license.type) && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">$</span>
                                  <Input
                                    type="number"
                                    value={beatForm.licensePrices[license.type] || license.defaultPrice}
                                    onChange={(e) => setBeatForm(prev => ({
                                      ...prev,
                                      licensePrices: {
                                        ...prev.licensePrices,
                                        [license.type]: parseFloat(e.target.value) || license.defaultPrice
                                      }
                                    }))}
                                    className="w-20"
                                    min="1"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stems Upload */}
                      <div className="space-y-3">
                        <Label>
                          Stems
                          {beatForm.selectedLicenses.some(l => ['exclusive_rights'].includes(l)) && 
                            <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">Required</span>
                          }
                        </Label>
                        <FileUpload
                          onUpload={(url, fileName) => {
                            setBeatForm(prev => ({ ...prev, stems_url: url }));
                          }}
                          accept="audio/*,.zip,.rar"
                          bucketName="audio-files"
                          maxSizeMB={100}
                          allowMultiple={true}
                        >
                          <Button type="button" variant="outline" className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Stems (drag audio files or ZIP)
                          </Button>
                        </FileUpload>
                        {beatForm.stems_url && (
                          <p className="text-sm text-muted-foreground">✓ Stems uploaded</p>
                        )}
                      </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="flex items-center space-x-2">
                           <Switch
                             id="beat_published"
                             checked={beatForm.is_published}
                             onCheckedChange={(checked) => setBeatForm(prev => ({ ...prev, is_published: checked }))}
                           />
                           <Label htmlFor="beat_published">Publish to Marketplace</Label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Switch
                             id="beat_featured"
                             checked={beatForm.is_featured}
                             onCheckedChange={(checked) => setBeatForm(prev => ({ ...prev, is_featured: checked }))}
                           />
                           <Label htmlFor="beat_featured">Featured Beat</Label>
                         </div>
                       </div>

                      <Button type="submit" className="w-full">
                        {editingBeat ? 'Update Beat' : 'Create Beat'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead>Title</TableHead>
                       <TableHead>Genre</TableHead>
                       <TableHead>BPM</TableHead>
                       <TableHead>Key</TableHead>
                       <TableHead>Price</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Created By</TableHead>
                       <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beats.map((beat: any) => (
                      <TableRow key={beat.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {beat.image_url && (
                              <img 
                                src={beat.image_url} 
                                alt="Beat artwork" 
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="font-medium">{beat.title}</div>
                              {beat.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-32">
                                  {beat.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EnhancedBadge variant="outline">{beat.genre}</EnhancedBadge>
                        </TableCell>
                        <TableCell>{beat.bpm || 'N/A'} BPM</TableCell>
                        <TableCell>{beat.key || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(beat.price)}</TableCell>
                         <TableCell>
                           <div className="flex gap-1">
                             {beat.is_published ? (
                                <EnhancedBadge className="bg-green-100 text-green-800">Published</EnhancedBadge>
                              ) : (
                                <EnhancedBadge variant="secondary">Draft</EnhancedBadge>
                              )}
                              {beat.is_featured && <EnhancedBadge variant="default">Featured</EnhancedBadge>}
                           </div>
                         </TableCell>
                         <TableCell>
                           {beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown')}
                           {beat.uploaded_by_admin && (
                             <EnhancedBadge variant="outline" className="ml-2 text-xs">Admin Upload</EnhancedBadge>
                           )}
                         </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingBeat(beat);
                                 setBeatForm({
                                    title: beat.title,
                                    description: beat.description || '',
                                    genre: beat.genre || '',
                                    bpm: beat.bpm?.toString() || '',
                                    key: beat.key || '',
                                    audio_url: beat.audio_url || '',
                                   image_url: beat.image_url || '',
                                   tags: beat.tags?.join(', ') || '',
                                   is_published: beat.is_published,
                                   is_featured: beat.is_featured || false,
                                   producer_name: beat.producer_name || '',
                                   stems_url: beat.stems_url || '',
                                   selectedLicenses: ['basic_lease'],
                                   licensePrices: { basic_lease: 25, premium_lease: 50, unlimited_lease: 100, exclusive_rights: 500 }
                                 });
                                setBeatDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteBeat(beat.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <AdminProductManager />
          </TabsContent>


          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <EnhancedAdminCourseManager />
          </TabsContent>


          {/* Directory Tab */}
          <TabsContent value="directory" className="space-y-6">
            <DirectorySubmissions />
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="user-management" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
            </div>
            
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Subscriptions
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="mailing-list" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Mailing List
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email/ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {user.avatar_url && (
                                  <img 
                                    src={user.avatar_url} 
                                    alt="Avatar" 
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{user.full_name || user.username || 'Unknown'}</div>
                                  {user.username && <div className="text-sm text-muted-foreground">@{user.username}</div>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{user.user_id.slice(0, 8)}...</TableCell>
                            <TableCell>
                               <EnhancedBadge variant="outline">{user.user_type || 'user'}</EnhancedBadge>
                            </TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                             <TableCell>
                               <Dialog>
                                 <DialogTrigger asChild>
                                   <Button variant="outline" size="sm">
                                     <Eye className="w-4 h-4" />
                                   </Button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-2xl">
                                   <DialogHeader>
                                     <DialogTitle>User Details</DialogTitle>
                                   </DialogHeader>
                                   <div className="space-y-4">
                                     <div className="flex items-center gap-4">
                                       {user.avatar_url && (
                                         <img 
                                           src={user.avatar_url} 
                                           alt="Avatar" 
                                           className="w-16 h-16 rounded-full"
                                         />
                                       )}
                                       <div>
                                         <h3 className="text-lg font-medium">{user.full_name || user.username || 'Unknown'}</h3>
                                         {user.username && <p className="text-muted-foreground">@{user.username}</p>}
                                       </div>
                                     </div>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <Label>User ID</Label>
                                         <p className="font-mono text-sm">{user.user_id}</p>
                                       </div>
                                       <div>
                                         <Label>User Type</Label>
                                         <EnhancedBadge variant="outline">{user.user_type || 'user'}</EnhancedBadge>
                                       </div>
                                       <div>
                                         <Label>Joined Date</Label>
                                         <p>{new Date(user.created_at).toLocaleDateString()}</p>
                                       </div>
                                       <div>
                                         <Label>Last Updated</Label>
                                         <p>{new Date(user.updated_at).toLocaleDateString()}</p>
                                       </div>
                                     </div>
                                     {user.bio && (
                                       <div>
                                         <Label>Bio</Label>
                                         <p className="text-sm">{user.bio}</p>
                                       </div>
                                     )}
                                   </div>
                                 </DialogContent>
                               </Dialog>
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Period Start</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub: any) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              {sub.profiles?.username || sub.profiles?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <EnhancedBadge variant={sub.tier === 'pro' ? 'default' : sub.tier === 'creator' ? 'secondary' : 'outline'}>
                                {sub.tier}
                              </EnhancedBadge>
                            </TableCell>
                            <TableCell>
                              <EnhancedBadge variant={sub.status === 'active' ? 'default' : 'destructive'}>
                                {sub.status}
                              </EnhancedBadge>
                            </TableCell>
                            <TableCell>
                              {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={sub.tier}
                                onValueChange={(value) => updateSubscriptionTier(sub.user_id, value as any)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="creator">Creator</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                            <TableCell>{order.user_email || 'Unknown'}</TableCell>
                            <TableCell>{formatCurrency(order.total)}</TableCell>
                            <TableCell>
                              <EnhancedBadge variant={
                                order.status === 'completed' ? 'default' : 
                                order.status === 'processing' ? 'secondary' : 
                                'destructive'
                              }>
                                {order.status}
                              </EnhancedBadge>
                            </TableCell>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Select
                                value={order.status}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Professional</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking: any) => (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.service || 'N/A'}</TableCell>
                            <TableCell>
                              {booking.client?.username || booking.client?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {booking.professional?.username || booking.professional?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <EnhancedBadge variant={
                                booking.status === 'confirmed' ? 'default' : 
                                booking.status === 'pending' ? 'secondary' : 
                                'destructive'
                              }>
                                {booking.status}
                              </EnhancedBadge>
                            </TableCell>
                            <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Select
                                value={booking.status}
                                onValueChange={(value) => updateBookingStatus(booking.id, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="mailing-list">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Mailing List Subscribers ({mailingList.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          const csv = [
                            ['Email', 'Created At'],
                            ...mailingList.map(subscriber => [
                              subscriber.email,
                              new Date(subscriber.created_at).toLocaleDateString()
                            ])
                          ].map(row => row.join(',')).join('\n');
                          
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'mailing-list.csv';
                          a.click();
                          window.URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Success",
                            description: "Mailing list exported successfully"
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to export mailing list",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mailingList.map((subscriber) => (
                        <TableRow key={subscriber.id}>
                          <TableCell>{subscriber.email}</TableCell>
                          <TableCell>
                            {new Date(subscriber.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('mailing_list')
                                    .delete()
                                    .eq('id', subscriber.id);
                                  if (error) throw error;
                                  toast({
                                    title: "Success",
                                    description: "Subscriber deleted successfully"
                                  });
                                  fetchAllData();
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete subscriber",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Blog Management</CardTitle>
                <p className="text-muted-foreground">
                  Create and manage blog posts for the community
                </p>
              </CardHeader>
              <CardContent>
                <AdminBlogManager />
              </CardContent>
            </Card>
          </TabsContent>
          {/* Site Admin Tab */}
          <TabsContent value="site-admin" className="space-y-6">
            <Tabs defaultValue="integrations" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="integrations" className="flex items-center gap-2">
                  <Plug className="w-4 h-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="page-directory" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Page Directory
                </TabsTrigger>
              </TabsList>

              <TabsContent value="integrations" className="space-y-6">
                <IntegrationsHealthCheck />
              </TabsContent>

              <TabsContent value="page-directory" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Page Directory
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Browse all available pages in the application. Links marked with <AlertCircle className="w-4 h-4 inline text-amber-500" /> are not accessible through main navigation.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    
                    {/* Core Platform Pages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Core Platform</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Home</h4>
                              <p className="text-sm text-muted-foreground">Landing page</p>
                            </div>
                            <a href="/" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Releases</h4>
                              <p className="text-sm text-muted-foreground">Music releases</p>
                            </div>
                            <a href="/releases" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Marketplace</h4>
                              <p className="text-sm text-muted-foreground">Beat marketplace</p>
                            </div>
                            <a href="/marketplace" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Community</h4>
                              <p className="text-sm text-muted-foreground">Social features</p>
                            </div>
                            <a href="/community" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Live</h4>
                              <p className="text-sm text-muted-foreground">Live events</p>
                            </div>
                            <a href="/live" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Commerce & Store */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Commerce & Store</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Store</h4>
                                <p className="text-sm text-muted-foreground">Main store page</p>
                              </div>
                            </div>
                            <a href="/store" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Sample Packs</h4>
                                <p className="text-sm text-muted-foreground">Sample pack store</p>
                              </div>
                            </div>
                            <a href="/sample-pack-store" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Subscription</h4>
                              <p className="text-sm text-muted-foreground">Pricing plans</p>
                            </div>
                            <a href="/subscription" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Favorites</h4>
                                <p className="text-sm text-muted-foreground">User wishlist</p>
                              </div>
                            </div>
                            <a href="/favorites" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Creator Tools */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Creator Tools</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Tools</h4>
                                <p className="text-sm text-muted-foreground">Creator utilities</p>
                              </div>
                            </div>
                            <a href="/tools" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Playlists</h4>
                                <p className="text-sm text-muted-foreground">Playlist creator</p>
                              </div>
                            </div>
                            <a href="/playlists" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Audio Uploader</h4>
                                <p className="text-sm text-muted-foreground">Upload audio files</p>
                              </div>
                            </div>
                            <a href="/audio-uploader" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Studio</h4>
                                <p className="text-sm text-muted-foreground">Music studio</p>
                              </div>
                            </div>
                            <a href="/studio" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Beat Maker</h4>
                                <p className="text-sm text-muted-foreground">Beat creation tool</p>
                              </div>
                            </div>
                            <a href="/beat-maker" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Academy</h4>
                                <p className="text-sm text-muted-foreground">Learning platform</p>
                              </div>
                            </div>
                            <a href="/academy" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Platform Pages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Platform Pages</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Profile</h4>
                              <p className="text-sm text-muted-foreground">User profile page</p>
                            </div>
                            <a href="/profile" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Wallet</h4>
                                <p className="text-sm text-muted-foreground">User wallet</p>
                              </div>
                            </div>
                            <a href="/wallet" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Referrals</h4>
                                <p className="text-sm text-muted-foreground">Referral system</p>
                              </div>
                            </div>
                            <a href="/referrals" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Analytics</h4>
                                <p className="text-sm text-muted-foreground">User analytics</p>
                              </div>
                            </div>
                            <a href="/analytics" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Settings</h4>
                                <p className="text-sm text-muted-foreground">User settings</p>
                              </div>
                            </div>
                            <a href="/settings" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Authentication & Legal */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Authentication & Legal</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Login</h4>
                              <p className="text-sm text-muted-foreground">User login</p>
                            </div>
                            <a href="/login" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Sign Up</h4>
                              <p className="text-sm text-muted-foreground">User registration</p>
                            </div>
                            <a href="/signup" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Privacy Policy</h4>
                              <p className="text-sm text-muted-foreground">Privacy information</p>
                            </div>
                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Terms of Service</h4>
                              <p className="text-sm text-muted-foreground">Terms and conditions</p>
                            </div>
                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Forgot Password</h4>
                                <p className="text-sm text-muted-foreground">Password reset</p>
                              </div>
                            </div>
                            <a href="/forgot-password" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Reset Password</h4>
                                <p className="text-sm text-muted-foreground">Password reset form</p>
                              </div>
                            </div>
                            <a href="/reset-password" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Special Pages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Special Pages</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">About</h4>
                              <p className="text-sm text-muted-foreground">About us page</p>
                            </div>
                            <a href="/about" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Contact</h4>
                              <p className="text-sm text-muted-foreground">Contact information</p>
                            </div>
                            <a href="/contact" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Support</h4>
                                <p className="text-sm text-muted-foreground">Support center</p>
                              </div>
                            </div>
                            <a href="/support" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Coming Soon</h4>
                                <p className="text-sm text-muted-foreground">Coming soon page</p>
                              </div>
                            </div>
                            <a href="/coming-soon" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Not Found (404)</h4>
                                <p className="text-sm text-muted-foreground">Error page</p>
                              </div>
                            </div>
                            <a href="/404" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Admin Pages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Admin</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Admin</h4>
                              <p className="text-sm text-muted-foreground">Admin dashboard</p>
                            </div>
                            <a href="/admin" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Admin Analytics</h4>
                              <p className="text-sm text-muted-foreground">Platform analytics</p>
                            </div>
                            <a href="/admin/analytics" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Admin Payouts</h4>
                              <p className="text-sm text-muted-foreground">Payout management</p>
                            </div>
                            <a href="/admin/payouts" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Beta Program</h4>
                                <p className="text-sm text-muted-foreground">Beta features</p>
                              </div>
                            </div>
                            <a href="/beta" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Roadmap</h4>
                                <p className="text-sm text-muted-foreground">Development roadmap</p>
                              </div>
                            </div>
                            <a href="/roadmap" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Referrals</h4>
                                <p className="text-sm text-muted-foreground">Referral program</p>
                              </div>
                            </div>
                            <a href="/referrals" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Specialized Pages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Specialized</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <div>
                                <h4 className="font-medium">Embeds</h4>
                                <p className="text-sm text-muted-foreground">Embed widgets</p>
                              </div>
                            </div>
                            <a href="/dashboard/creator/embeds" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-accent rounded-md">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="enhanced-tools" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Enhanced Admin Tools</h2>
              <p className="text-muted-foreground">Access powerful enhanced versions of admin tools with advanced features.</p>
            </div>

            {/* Content Management Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">Content Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/catalog', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Enhanced Catalog</CardTitle>
                        <p className="text-xs text-muted-foreground">Advanced catalog management</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Manage beats, releases, and sample packs with advanced filtering and bulk operations.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/blog', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Blog Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Content publishing</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Create, edit, and manage blog posts with rich content and media uploads.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/courses', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Course Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Educational content</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Create courses with lessons, quizzes, and multimedia content.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/videos', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Video className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Video Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Video content</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Manage video content, associate with artists, and feature videos.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/events', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Events Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Event management</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Create and manage community events, workshops, and live sessions.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Commerce & Sales Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Commerce & Sales</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/products', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Product Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Store merchandise</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Manage store products, merchandise, pricing, and inventory.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/payouts', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Enhanced Payouts</CardTitle>
                        <p className="text-xs text-muted-foreground">Payment processing</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Process producer payouts with batch operations and analytics.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/bundles', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Package2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Bundle Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Product bundles</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Create and manage product bundles with discounts and special offers.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/distribution', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Music2 className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Distribution Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Streaming platforms</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Manage music distribution to streaming platforms and track performance.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* User & Community Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold">User & Community</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/artists', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-500/10 rounded-lg">
                        <UserCheck className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Artist Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Profile management</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Manage artist profiles, bios, images, and featured artists.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/quizzes', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <HelpCircle className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Quiz Manager</CardTitle>
                        <p className="text-xs text-muted-foreground">Educational assessments</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Create course quizzes with AI-powered question generation.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* System & Security Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold">System & Security</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/admin/security', '_blank')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Shield className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Security Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground">Database security</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs mb-3">Monitor RLS policies and ensure data protection across tables.</p>
                    <div className="flex items-center text-primary text-xs group-hover:underline">
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Enhanced Tools Benefits</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enhanced admin tools provide better performance, advanced filtering, bulk operations, and real-time analytics. 
                    They open in new tabs so you can work with multiple tools simultaneously.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Contests Tab */}
          <TabsContent value="contests" className="space-y-6">
            <AdminContestManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;