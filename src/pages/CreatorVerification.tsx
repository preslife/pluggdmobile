import { useState, useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, XCircle, Upload, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CreatorVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    officialWebsite: "",
    managementContact: "",
    socialLinks: "",
    additionalInfo: ""
  });
  const [idFile, setIdFile] = useState<File | null>(null);

  useEffect(() => {
    setMeta(
      "Creator Verification — Pluggd",
      "Get verified as a legitimate creator and earn the verified badge.",
      "/dashboard/creator/verify"
    );
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idFile) {
      toast({
        title: "Missing Requirements",
        description: "Please upload a government ID file",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload ID file to verification bucket
      const fileName = `${user.id}/government-id-${Date.now()}.${idFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('verification')
        .upload(fileName, idFile);

      if (uploadError) throw uploadError;

      // Create verification submission using directory_submissions table
      const { error: submissionError } = await supabase
        .from('directory_submissions')
        .insert({
          user_id: user.id,
          title: 'Creator Verification Request',
          bio: `Verification Request: ${formData.additionalInfo}`,
          website_url: formData.officialWebsite,
          social_links: {
            management: formData.managementContact,
            social: formData.socialLinks,
            id_file: fileName
          },
          location: 'Creator Verification',
          experience: 'Verification Request'
        });

      if (submissionError) throw submissionError;

      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Refresh profile data
      await fetchProfile();

      toast({
        title: "Verification Submitted",
        description: "Your verification request has been submitted for review.",
      });

      // Reset form
      setFormData({
        officialWebsite: "",
        managementContact: "",
        socialLinks: "",
        additionalInfo: ""
      });
      setIdFile(null);

    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (profile?.verification_status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (profile?.verification_status) {
      case 'approved':
        return 'Verified Creator';
      case 'pending':
        return 'Verification Pending';
      case 'rejected':
        return 'Verification Rejected';
      default:
        return 'Not Verified';
    }
  };

  const getStatusDescription = () => {
    switch (profile?.verification_status) {
      case 'approved':
        return 'Congratulations! You are now a verified creator on Pluggd.';
      case 'pending':
        return 'Your verification request is being reviewed by our team.';
      case 'rejected':
        return profile?.verification_note || 'Your verification request was rejected. Please contact support for more information.';
      default:
        return 'Submit a verification request to get the verified creator badge.';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Creator Verification</h1>
            <p className="text-muted-foreground">
              Get verified as a legitimate creator and earn the verified badge
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusText()}
              </CardTitle>
              <CardDescription>
                {getStatusDescription()}
              </CardDescription>
            </CardHeader>
            {profile?.verification_status === 'approved' && (
              <CardContent>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You are now a verified creator! The verified badge will appear on your profile, releases, and throughout the platform.
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {(profile?.verification_status === 'none' || profile?.verification_status === 'rejected') && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Verification Request</CardTitle>
                <CardDescription>
                  Provide the required information to verify your creator status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="id-upload">Government ID *</Label>
                    <Input
                      id="id-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                      className="mt-1"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a clear photo of your government-issued ID (driver's license, passport, etc.)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="website">Official Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.officialWebsite}
                      onChange={(e) => setFormData({ ...formData, officialWebsite: e.target.value })}
                      placeholder="https://your-website.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="management">Management Contact</Label>
                    <Input
                      id="management"
                      type="email"
                      value={formData.managementContact}
                      onChange={(e) => setFormData({ ...formData, managementContact: e.target.value })}
                      placeholder="manager@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="social">Social Media Links</Label>
                    <Textarea
                      id="social"
                      value={formData.socialLinks}
                      onChange={(e) => setFormData({ ...formData, socialLinks: e.target.value })}
                      placeholder="Instagram: @yourhandle&#10;Twitter: @yourhandle&#10;YouTube: channel/link"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="additional">Additional Information</Label>
                    <Textarea
                      id="additional"
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      placeholder="Any additional information to support your verification request..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Your information will be kept confidential and only used for verification purposes. 
                      Processing typically takes 3-5 business days.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    type="submit" 
                    disabled={submitting || !idFile}
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Verification Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreatorVerification;