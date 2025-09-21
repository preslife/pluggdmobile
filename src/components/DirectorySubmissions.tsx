import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DirectorySubmission {
  id: string;
  title: string;
  bio: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  location?: string;
  genres: string[];
  hourly_rate?: string;
  experience?: string;
  credits: string[];
  social_links: any;
  website_url?: string;
  created_at: string;
}

export const DirectorySubmissions = () => {
  const [submissions, setSubmissions] = useState<DirectorySubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DirectorySubmission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('directory_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSubmission = async (submission: DirectorySubmission) => {
    try {
      // First, approve the submission
      const { error: updateError } = await supabase
        .from('directory_submissions')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Then, create an approved profile
      const { error: insertError } = await supabase
        .from('approved_directory_profiles')
        .insert({
          submission_id: submission.id,
          user_id: submission.user_id,
          title: submission.title,
          bio: submission.bio,
          location: submission.location,
          genres: submission.genres,
          hourly_rate: submission.hourly_rate,
          experience: submission.experience,
          credits: submission.credits,
          social_links: submission.social_links,
          website_url: submission.website_url,
          verified: false,
          rating: 0,
          reviews_count: 0
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Submission approved and profile created",
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive",
      });
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('directory_submissions')
        .update({ status: 'rejected' })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission rejected",
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);  
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Directory Submissions</h2>
        <div className="flex gap-2">
          <Badge variant="secondary">
            Pending: {submissions.filter(s => s.status === 'pending').length}
          </Badge>
          <Badge variant="default">
            Approved: {submissions.filter(s => s.status === 'approved').length}
          </Badge>
          <Badge variant="destructive">
            Rejected: {submissions.filter(s => s.status === 'rejected').length}
          </Badge>
        </div>
      </div>

      {/* Submissions List */}
      <div className="grid gap-4">
        {submissions.map((submission) => (
          <Card key={submission.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {submission.title}
                    <Badge variant={getStatusColor(submission.status)} className="capitalize">
                      {submission.status}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {submission.bio}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedSubmission?.title}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedSubmission && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Bio</h4>
                            <p className="text-sm text-muted-foreground">
                              {selectedSubmission.bio}
                            </p>
                          </div>

                          {selectedSubmission.location && (
                            <div>
                              <h4 className="font-semibold mb-2">Location</h4>
                              <p className="text-sm">{selectedSubmission.location}</p>
                            </div>
                          )}

                          {selectedSubmission.genres.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Genres</h4>
                              <div className="flex flex-wrap gap-1">
                                {selectedSubmission.genres.map((genre, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {genre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedSubmission.hourly_rate && (
                            <div>
                              <h4 className="font-semibold mb-2">Hourly Rate</h4>
                              <p className="text-sm">{selectedSubmission.hourly_rate}</p>
                            </div>
                          )}

                          {selectedSubmission.experience && (
                            <div>
                              <h4 className="font-semibold mb-2">Experience</h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedSubmission.experience}
                              </p>
                            </div>
                          )}

                          {selectedSubmission.credits.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Credits</h4>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {selectedSubmission.credits.map((credit, index) => (
                                  <li key={index}>{credit}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedSubmission.website_url && (
                            <div>
                              <h4 className="font-semibold mb-2">Website</h4>
                              <a 
                                href={selectedSubmission.website_url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-sm text-primary hover:underline"
                              >
                                {selectedSubmission.website_url}
                              </a>
                            </div>
                          )}

                          {selectedSubmission.status === 'pending' && (
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  handleRejectSubmission(selectedSubmission.id);
                                  setIsViewModalOpen(false);
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => {
                                  handleApproveSubmission(selectedSubmission);
                                  setIsViewModalOpen(false);
                                }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {submission.status === 'pending' && (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRejectSubmission(submission.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveSubmission(submission)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  {submission.location && <span>{submission.location}</span>}
                  {submission.hourly_rate && <span>{submission.hourly_rate}</span>}
                  <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {submission.genres.slice(0, 3).map((genre, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {submissions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No submissions found.</p>
        </div>
      )}
    </div>
  );
};