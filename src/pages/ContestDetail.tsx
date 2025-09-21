import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";
import { getContestStatus, getTimeRemaining } from "@/utils/contests";
import { useContestRealtime } from "@/hooks/useContestRealtime";
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Award, 
  Upload,
  Vote,
  ArrowLeft,
  Users,
  Music,
  Bell,
  BellOff,
  Download,
  FileImage
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  cover_image_url?: string;
  resource_files?: any[];
  additional_images?: any[];
}

interface Submission {
  id: string;
  user_id: string;
  submission_title: string;
  submission_description?: string;
  submission_url?: string;
  votes_count: number;
  created_at: string;
  profiles?: {
    username?: string;
    full_name?: string;
  };
}

const ContestDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userSubmission, setUserSubmission] = useState<Submission | null>(null);
  const [votedSubmissions, setVotedSubmissions] = useState<Set<string>>(new Set());
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  
  // Submission form
  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    description: "",
    url: ""
  });

  useEffect(() => {
    if (id) {
      fetchContest();
      fetchSubmissions();
      fetchUserVotes();
      fetchReminderStatus();
    }
  }, [id, user]);

  // Set up real-time updates for contest submissions and votes
  useContestRealtime(id, {
    onSubmissionInsert: () => {
      fetchSubmissions();
    },
    onSubmissionUpdate: () => {
      fetchSubmissions();
    },
    onVoteInsert: () => {
      fetchSubmissions();
      fetchUserVotes();
    }
  });

  const fetchContest = async () => {
    try {
      console.log('Fetching contest with ID:', id);
      
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No contest found with ID:', id);
        throw new Error('Contest not found');
      }

      console.log('Contest loaded successfully:', data);
      setContest({
        ...data,
        resource_files: Array.isArray(data.resource_files) ? data.resource_files : [],
        additional_images: Array.isArray(data.additional_images) ? data.additional_images : []
      });
      setMeta(
        `${data.title} — Contest`,
        data.description || `Join the ${data.title} contest and showcase your talent`,
        `/contests/${id}`
      );
    } catch (error) {
      console.error('Error fetching contest:', error);
      toast({
        title: "Error",
        description: "Failed to load contest details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // Fetch submissions first
      const { data: submissionsData, error } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', id)
        .order('votes_count', { ascending: false });

      if (error) throw error;

      let submissionsWithProfiles = submissionsData || [];

      // Fetch profiles separately if we have submissions
      if (submissionsData && submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.map(sub => sub.user_id))];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, full_name')
          .in('user_id', userIds);

        // Combine submissions with profile data
        submissionsWithProfiles = submissionsData.map(submission => ({
          ...submission,
          profiles: profilesData?.find(profile => profile.user_id === submission.user_id) || null
        }));
      }

      setSubmissions(submissionsWithProfiles);
      
      // Check if user has already submitted
      if (user && submissionsWithProfiles) {
        const userSub = submissionsWithProfiles.find(sub => sub.user_id === user.id);
        setUserSubmission(userSub || null);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('contest_votes')
        .select('submission_id')
        .eq('contest_id', id)
        .eq('voter_id', user.id);

      if (error) throw error;
      
      const votedIds = new Set(data?.map(vote => vote.submission_id) || []);
      setVotedSubmissions(votedIds);
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const fetchReminderStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('contest_reminders')
        .select('id')
        .eq('contest_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setHasReminder(!!data);
    } catch (error) {
      console.error('Error fetching reminder status:', error);
    }
  };

  const handleReminderToggle = async () => {
    if (!user || !contest) return;

    setReminderLoading(true);
    try {
      if (hasReminder) {
        // Remove reminder
        const { error } = await supabase
          .from('contest_reminders')
          .delete()
          .eq('contest_id', contest.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setHasReminder(false);
        toast({
          title: "Reminder removed",
          description: "You'll no longer be notified when this contest starts"
        });
      } else {
        // Add reminder
        const { error } = await supabase
          .from('contest_reminders')
          .insert([{
            contest_id: contest.id,
            user_id: user.id
          }]);

        if (error) throw error;

        setHasReminder(true);
        toast({
          title: "Reminder set!",
          description: "We'll notify you when this contest starts"
        });
      }
    } catch (error) {
      console.error('Reminder toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive"
      });
    } finally {
      setReminderLoading(false);
    }
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contest) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .insert([{
          challenge_id: contest.id,
          user_id: user.id,
          submission_title: submissionForm.title,
          submission_description: submissionForm.description,
          submission_url: submissionForm.url
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your submission has been entered!"
      });

      setSubmissionForm({ title: "", description: "", url: "" });
      fetchSubmissions();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit entry",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!user || !contest) return;

    try {
      const { error } = await supabase
        .from('contest_votes')
        .insert([{
          contest_id: contest.id,
          submission_id: submissionId,
          voter_id: user.id
        }]);

      if (error) throw error;

      setVotedSubmissions(prev => new Set(prev).add(submissionId));
      fetchSubmissions(); // Refresh to update vote counts
      
      toast({
        title: "Vote cast!",
        description: "Thank you for voting"
      });
    } catch (error) {
      console.error('Voting error:', error);
      toast({
        title: "Error",
        description: "Failed to cast vote",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6" />
            <Skeleton className="h-12 w-96 mb-4" />
            <Skeleton className="h-32 w-full mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Skeleton className="h-64 w-full" />
              </div>
              <div>
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
          <Link to="/challenges">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const contestStatus = getContestStatus(contest);
  const timeRemaining = getTimeRemaining(contest);
  const canSubmit = contestStatus === 'active' && !userSubmission;
  const canVote = contestStatus === 'voting';

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-16 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/challenges" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contests
          </Link>

          {/* Contest Header */}
          <div className="mb-8">
            {/* Cover Image */}
            {contest.cover_image_url && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg mb-6">
                <img 
                  src={contest.cover_image_url} 
                  alt={contest.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-4">
              <Badge variant={contestStatus === 'active' ? 'default' : 'secondary'} className="text-sm">
                {contestStatus === 'active' && <Clock className="w-3 h-3 mr-1" />}
                {contestStatus === 'voting' && <Vote className="w-3 h-3 mr-1" />}
                {contestStatus === 'upcoming' && <Calendar className="w-3 h-3 mr-1" />}
                {contestStatus === 'completed' && <Trophy className="w-3 h-3 mr-1" />}
                <span className="capitalize">{contestStatus}</span>
              </Badge>
              {contest.theme && (
                <Badge variant="outline">{contest.theme}</Badge>
              )}
              {contest.genre && (
                <Badge variant="outline">{contest.genre}</Badge>
              )}
            </div>
            
            <h1 className="text-4xl font-bold mb-4">{contest.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{contest.description}</p>
            
            {contestStatus !== 'completed' && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{timeRemaining}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{submissions.length} submissions</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contest Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contest Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Rules</h4>
                    <p className="text-muted-foreground">{contest.rules || "Standard contest rules apply."}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Start Date:</span>
                      <br />
                      {new Date(contest.start_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">End Date:</span>
                      <br />
                      {new Date(contest.end_date).toLocaleDateString()}
                    </div>
                    {contest.voting_end_date && (
                      <div>
                        <span className="font-medium">Voting Ends:</span>
                        <br />
                        {new Date(contest.voting_end_date).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Max Submissions:</span>
                      <br />
                      {contest.max_submissions}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contest Resources */}
              {contest.resource_files && contest.resource_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Contest Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contest.resource_files.map((file: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {file.file_type === 'image' ? <FileImage className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{file.file_name}</p>
                              {file.description && (
                                <p className="text-xs text-muted-foreground">{file.description}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.file_url, '_blank')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Images Gallery */}
              {contest.additional_images && contest.additional_images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileImage className="w-5 h-5" />
                      Contest Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {contest.additional_images.map((image: any, index: number) => (
                        <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
                          <img 
                            src={image.file_url} 
                            alt={image.file_name}
                            className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(image.file_url, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Submissions ({submissions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : submissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No submissions yet. Be the first to enter!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{submission.submission_title}</h4>
                              <p className="text-sm text-muted-foreground">
                                by {submission.profiles?.full_name || submission.profiles?.username || 'Anonymous'}
                              </p>
                              {submission.submission_description && (
                                <p className="text-sm mt-2">{submission.submission_description}</p>
                              )}
                              {submission.submission_url && (
                                <a 
                                  href={submission.submission_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm mt-2 inline-block"
                                >
                                  Listen →
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{submission.votes_count} votes</span>
                              {canVote && user && submission.user_id !== user.id && (
                                <Button
                                  size="sm"
                                  variant={votedSubmissions.has(submission.id) ? "secondary" : "outline"}
                                  onClick={() => handleVote(submission.id)}
                                  disabled={votedSubmissions.has(submission.id)}
                                >
                                  <Vote className="w-3 h-3 mr-1" />
                                  {votedSubmissions.has(submission.id) ? 'Voted' : 'Vote'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Prize */}
              {contest.prize_description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-gold" />
                      Prize
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gold font-medium">{contest.prize_description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Submit Entry */}
              {canSubmit && user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Submit Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmission} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Track Title</Label>
                        <Input
                          id="title"
                          value={submissionForm.title}
                          onChange={(e) => setSubmissionForm(prev => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          value={submissionForm.description}
                          onChange={(e) => setSubmissionForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="url">Track URL</Label>
                        <Input
                          id="url"
                          type="url"
                          value={submissionForm.url}
                          onChange={(e) => setSubmissionForm(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://soundcloud.com/..."
                          required
                        />
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Entry"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* User already submitted */}
              {userSubmission && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Your Submission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{userSubmission.submission_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {userSubmission.votes_count} votes
                    </p>
                    {userSubmission.submission_url && (
                      <a 
                        href={userSubmission.submission_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm mt-2 inline-block"
                      >
                        Listen to your entry →
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Remind Me for upcoming contests */}
              {contestStatus === 'upcoming' && user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Contest Reminder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Get notified when this contest starts so you don't miss out!
                    </p>
                    <Button 
                      onClick={handleReminderToggle}
                      disabled={reminderLoading}
                      variant={hasReminder ? "secondary" : "default"}
                      className="w-full"
                    >
                      {reminderLoading ? (
                        "Updating..."
                      ) : hasReminder ? (
                        <>
                          <BellOff className="w-4 h-4 mr-2" />
                          Reminder Set ✓
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          Remind Me
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Login prompt for upcoming contests */}
              {!user && contestStatus === 'upcoming' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Get Notified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Sign in to get reminded when this contest starts.
                    </p>
                    <Link to="/auth">
                      <Button className="w-full">Sign In</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Login prompt for active contests */}
              {!user && canSubmit && (
                <Card>
                  <CardHeader>
                    <CardTitle>Join the Contest</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Sign in to submit your entry and vote on submissions.
                    </p>
                    <Link to="/auth">
                      <Button className="w-full">Sign In</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContestDetail;