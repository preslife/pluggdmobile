import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  email?: string;
  title?: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
    verification_status: string;
  };
}

export const AdminVerificationTab = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('directory_submissions')
        .select(`
          id,
          user_id,
          created_at,
          status,
          profiles!inner(username, full_name, avatar_url, verification_status)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, userId: string) => {
    setActionLoading(requestId);
    try {
      // Update directory submission status
      const { error: submissionError } = await supabase
        .from('directory_submissions')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (submissionError) throw submissionError;

      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'verified',
          is_verified: true,
          verification_note: 'Approved by admin'
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: 'Verification Approved',
        description: 'Creator has been verified successfully',
      });

      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRequest = async (requestId: string, userId: string, note: string) => {
    setActionLoading(requestId);
    try {
      // Update directory submission status
      const { error: submissionError } = await supabase
        .from('directory_submissions')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (submissionError) throw submissionError;

      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'rejected',
          is_verified: false,
          verification_note: note || 'Request rejected'
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: 'Verification Rejected',
        description: 'Creator verification has been rejected',
      });

      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      setRejectionNote('');
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">Loading verification requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Verification Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No pending verification requests
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {request.profiles?.avatar_url && (
                        <img
                          src={request.profiles.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">
                          {request.profiles?.full_name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>@{request.profiles?.username || 'unknown'}</TableCell>
                  <TableCell>
                    {request.title || '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pending</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Verification Request Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Creator Name</Label>
                              <div className="text-sm font-medium">
                                {request.profiles?.full_name || 'Unknown'}
                              </div>
                            </div>
                            <div>
                              <Label>Username</Label>
                              <div className="text-sm font-medium">
                                @{request.profiles?.username || 'unknown'}
                              </div>
                            </div>
                          </div>
                          
                          {request.email && (
                            <div>
                              <Label>Email</Label>
                              <div className="text-sm">{request.email}</div>
                            </div>
                          )}
                          
                          {request.title && (
                            <div>
                              <Label>Submission Title</Label>
                              <div className="text-sm">{request.title}</div>
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-3 pt-4 border-t">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => approveRequest(request.id, request.user_id)}
                                disabled={actionLoading === request.id}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Verification
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Reason for rejection (optional)"
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                              />
                              <Button
                                variant="destructive"
                                onClick={() => rejectRequest(request.id, request.user_id, rejectionNote)}
                                disabled={actionLoading === request.id}
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Verification
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};