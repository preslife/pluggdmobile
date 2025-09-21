import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Trophy, Users, Calendar, Award, Upload } from "lucide-react";
import { ContestFileUpload } from "./ContestFileUpload";
import { formatDistanceToNow } from "date-fns";

interface Contest {
  id: string;
  title: string;
  description: string;
  theme?: string;
  status: string;
  contest_type: string;
  genre?: string;
  rules?: string;
  prize_description?: string;
  start_date: string;
  end_date: string;
  voting_end_date?: string;
  max_submissions: number;
  created_at: string;
}

interface ContestForm {
  title: string;
  description: string;
  theme: string;
  contest_type: string;
  genre: string;
  rules: string;
  prize_description: string;
  start_date: string;
  end_date: string;
  voting_end_date: string;
  max_submissions: string;
  cover_image_url: string;
  resource_files: any[];
  additional_images: any[];
}

export const AdminContestManager = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [contestForm, setContestForm] = useState<ContestForm>({
    title: "",
    description: "",
    theme: "",
    contest_type: "monthly_contest",
    genre: "",
    rules: "",
    prize_description: "",
    start_date: "",
    end_date: "",
    voting_end_date: "",
    max_submissions: "1",
    cover_image_url: "",
    resource_files: [],
    additional_images: []
  });

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast({
        title: "Error",
        description: "Failed to load contests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const contestData = {
        ...contestForm,
        max_submissions: parseInt(contestForm.max_submissions),
        status: new Date(contestForm.start_date) > new Date() ? 'upcoming' : 'active'
      };

      if (editingContest) {
        const { error } = await supabase
          .from('contests')
          .update(contestData)
          .eq('id', editingContest.id);

        if (error) throw error;
        toast({ title: "Success", description: "Contest updated successfully" });
      } else {
        const { error } = await supabase
          .from('contests')
          .insert([contestData]);

        if (error) throw error;
        toast({ title: "Success", description: "Contest created successfully" });
      }

      setContestForm({
        title: "",
        description: "",
        theme: "",
        contest_type: "monthly_contest",
        genre: "",
        rules: "",
        prize_description: "",
        start_date: "",
        end_date: "",
        voting_end_date: "",
        max_submissions: "1",
        cover_image_url: "",
        resource_files: [],
        additional_images: []
      });
      setEditingContest(null);
      setDialogOpen(false);
      fetchContests();
    } catch (error) {
      console.error('Error saving contest:', error);
      toast({
        title: "Error",
        description: "Failed to save contest",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (contest: Contest) => {
    setEditingContest(contest);
    setContestForm({
      title: contest.title,
      description: contest.description,
      theme: contest.theme || "",
      contest_type: contest.contest_type,
      genre: contest.genre || "",
      rules: contest.rules || "",
      prize_description: contest.prize_description || "",
      start_date: contest.start_date.split('T')[0],
      end_date: contest.end_date.split('T')[0],
      voting_end_date: contest.voting_end_date ? contest.voting_end_date.split('T')[0] : "",
      max_submissions: contest.max_submissions.toString(),
      cover_image_url: (contest as any).cover_image_url || "",
      resource_files: (contest as any).resource_files || [],
      additional_images: (contest as any).additional_images || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contest?')) return;

    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Contest deleted successfully" });
      fetchContests();
    } catch (error) {
      console.error('Error deleting contest:', error);
      toast({
        title: "Error",
        description: "Failed to delete contest",
        variant: "destructive"
      });
    }
  };

  const updateContestStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Contest status updated" });
      fetchContests();
    } catch (error) {
      console.error('Error updating contest status:', error);
      toast({
        title: "Error",
        description: "Failed to update contest status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'voting': return 'bg-blue-500';
      case 'upcoming': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contest Management</h2>
          <p className="text-muted-foreground">Create and manage music contests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingContest(null);
                setContestForm({
                  title: "",
                  description: "",
                  theme: "",
                  contest_type: "monthly_contest",
                  genre: "",
                  rules: "",
                  prize_description: "",
                  start_date: "",
                  end_date: "",
                  voting_end_date: "",
                  max_submissions: "1",
                  cover_image_url: "",
                  resource_files: [],
                  additional_images: []
                });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Contest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContest ? 'Edit Contest' : 'Create New Contest'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Contest Title *</Label>
                  <Input
                    id="title"
                    value={contestForm.title}
                    onChange={(e) => setContestForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contest_type">Contest Type *</Label>
                  <Select value={contestForm.contest_type} onValueChange={(value) => 
                    setContestForm(prev => ({ ...prev, contest_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly_contest">Monthly Contest</SelectItem>
                      <SelectItem value="weekly_challenge">Weekly Challenge</SelectItem>
                      <SelectItem value="community_vote">Community Vote</SelectItem>
                      <SelectItem value="special_event">Special Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={contestForm.description}
                  onChange={(e) => setContestForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Input
                    id="theme"
                    value={contestForm.theme}
                    onChange={(e) => setContestForm(prev => ({ ...prev, theme: e.target.value }))}
                    placeholder="e.g., Dark Trap Vibes"
                  />
                </div>
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={contestForm.genre}
                    onChange={(e) => setContestForm(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="e.g., trap, lo-fi, hip-hop"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rules">Rules</Label>
                <Textarea
                  id="rules"
                  value={contestForm.rules}
                  onChange={(e) => setContestForm(prev => ({ ...prev, rules: e.target.value }))}
                  rows={3}
                  placeholder="Contest rules and requirements..."
                />
              </div>

              <div>
                <Label htmlFor="prize_description">Prize Description</Label>
                <Input
                  id="prize_description"
                  value={contestForm.prize_description}
                  onChange={(e) => setContestForm(prev => ({ ...prev, prize_description: e.target.value }))}
                  placeholder="e.g., £500 cash prize + featured placement"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={contestForm.start_date}
                    onChange={(e) => setContestForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={contestForm.end_date}
                    onChange={(e) => setContestForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="voting_end_date">Voting End Date</Label>
                  <Input
                    id="voting_end_date"
                    type="date"
                    value={contestForm.voting_end_date}
                    onChange={(e) => setContestForm(prev => ({ ...prev, voting_end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="max_submissions">Max Submissions Per User</Label>
                <Input
                  id="max_submissions"
                  type="number"
                  min="1"
                  value={contestForm.max_submissions}
                  onChange={(e) => setContestForm(prev => ({ ...prev, max_submissions: e.target.value }))}
                />
              </div>

              {/* File Upload Sections */}
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Cover Image
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">Upload a cover image that will be displayed on contest cards</p>
                  <ContestFileUpload
                    contestId={editingContest?.id}
                    fileType="cover"
                    maxFiles={1}
                    acceptedTypes={['image/*']}
                    onFilesUploaded={(files) => {
                      const coverUrl = files.length > 0 ? files[0].file_url : '';
                      setContestForm(prev => ({ ...prev, cover_image_url: coverUrl }));
                    }}
                    existingFiles={contestForm.cover_image_url ? [{
                      id: 'existing_cover',
                      file_name: 'Cover Image',
                      file_url: contestForm.cover_image_url,
                      file_type: 'image',
                      file_size: 0,
                      is_downloadable: false
                    }] : []}
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Resource Files
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">Upload downloadable resources like audio stems, samples, or documents</p>
                  <ContestFileUpload
                    contestId={editingContest?.id}
                    fileType="resource"
                    maxFiles={10}
                    acceptedTypes={['audio/*', 'application/*', '.zip', '.rar']}
                    onFilesUploaded={(files) => {
                      setContestForm(prev => ({ ...prev, resource_files: files }));
                    }}
                    existingFiles={contestForm.resource_files}
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Additional Images
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">Upload additional images to showcase in the contest gallery</p>
                  <ContestFileUpload
                    contestId={editingContest?.id}
                    fileType="gallery"
                    maxFiles={5}
                    acceptedTypes={['image/*']}
                    onFilesUploaded={(files) => {
                      setContestForm(prev => ({ ...prev, additional_images: files }));
                    }}
                    existingFiles={contestForm.additional_images}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingContest ? 'Update Contest' : 'Create Contest'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Contests ({contests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading contests...</div>
          ) : contests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contests found. Create your first contest to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests.map((contest) => (
                    <TableRow key={contest.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contest.title}</div>
                          {contest.theme && (
                            <div className="text-sm text-muted-foreground">{contest.theme}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{contest.contest_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(contest.status)}`} />
                          <span className="capitalize">{contest.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>Start: {new Date(contest.start_date).toLocaleDateString()}</div>
                        <div>End: {new Date(contest.end_date).toLocaleDateString()}</div>
                        {contest.voting_end_date && (
                          <div>Vote End: {new Date(contest.voting_end_date).toLocaleDateString()}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contest.prize_description || 'Not specified'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(contest.created_at))} ago
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(contest)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Select 
                            value={contest.status} 
                            onValueChange={(value) => updateContestStatus(contest.id, value)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="voting">Voting</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(contest.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};