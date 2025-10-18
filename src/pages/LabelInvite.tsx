import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { usePageMetadata } from "@/hooks/usePageMetadata";

type InviteStatus = "loading" | "valid" | "expired" | "invalid" | "already_member" | "accepted";

interface InviteData {
  label_name: string;
  label_slug: string;
  role: string;
  invited_by_name: string;
}

export default function LabelInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [accepting, setAccepting] = useState(false);
  const tokenPrefix = token ? token.slice(0, 8) : null;

  usePageMetadata({
    title: inviteData ? `Join ${inviteData.label_name} on Pluggd` : 'Label Invitation — Pluggd',
    description: inviteData
      ? `Accept your invitation to collaborate with ${inviteData.label_name} on Pluggd.`
      : 'Accept label invitations and collaborate with your team on Pluggd.',
    path: token ? `/labels/invite/${token}` : '/labels/invite',
  });

  const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      void logger.warn("label_invite_missing_token", {});
      return;
    }

    if (authLoading) return;

    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/labels/invite/${token}`);
      void logger.info("label_invite_redirect_to_auth", {
        token_prefix: tokenPrefix,
      });
      return;
    }

    checkInvitation();
  }, [token, user, authLoading]);

  const checkInvitation = async () => {
    if (!token || !user) return;

    try {
      void logger.info("label_invite_check_start", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      });
      // Check invitation details
      const { data, error } = await supabase.rpc("get_label_invitation_details", {
        p_token: token
      });

      if (error) {
        console.error("Error checking invitation:", error);
        setStatus("invalid");
      void logger.error("label_invite_check_failed", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      }, toError(error));
        return;
      }

      if (!data || data.length === 0) {
        setStatus("invalid");
      void logger.warn("label_invite_not_found", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      });
        return;
      }

      const invite = data[0];

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setStatus("expired");
        setInviteData({
          label_name: invite.label_name,
          label_slug: invite.label_slug,
          role: invite.role,
          invited_by_name: invite.invited_by_name || "Team Admin"
        });
      void logger.warn("label_invite_expired", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      });
        return;
      }

      // Check if already a member
      if (invite.is_member) {
        setStatus("already_member");
        setInviteData({
          label_name: invite.label_name,
          label_slug: invite.label_slug,
          role: invite.current_role || invite.role,
          invited_by_name: invite.invited_by_name || "Team Admin"
        });
      void logger.info("label_invite_already_member", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      });
        return;
      }

      setStatus("valid");
      setInviteData({
        label_name: invite.label_name,
        label_slug: invite.label_slug,
        role: invite.role,
        invited_by_name: invite.invited_by_name || "Team Admin"
      });
      void logger.info("label_invite_valid", {
        token_prefix: tokenPrefix,
        user_id: user.id,
        role: invite.role,
      });
    } catch (error) {
      console.error("Error checking invitation:", error);
      setStatus("invalid");
      void logger.error("label_invite_check_threw", {
        token_prefix: tokenPrefix,
        user_id: user?.id,
      }, toError(error));
    }
  };

  const handleAccept = async () => {
    if (!token || !user) return;

    setAccepting(true);
    void logger.userAction("label_invite_accept_attempt", "LabelInvitePage", {
      token_prefix: tokenPrefix,
      user_id: user.id,
    });
    try {
      const { data, error } = await supabase.rpc("accept_label_invite", {
        p_token: token
      });

      if (error) {
        console.error("Error accepting invitation:", error);
        if (error.message.includes("expired")) {
          setStatus("expired");
          toast.error("This invitation has expired");
        void logger.warn("label_invite_accept_expired", {
          token_prefix: tokenPrefix,
          user_id: user.id,
        });
        } else if (error.message.includes("already_member")) {
          setStatus("already_member");
          toast.info("You're already a member of this label");
        void logger.info("label_invite_accept_already_member", {
          token_prefix: tokenPrefix,
          user_id: user.id,
        });
        } else {
          toast.error("Failed to accept invitation");
        void logger.error("label_invite_accept_failed", {
          token_prefix: tokenPrefix,
          user_id: user.id,
        }, toError(error));
        }
        return;
      }

      setStatus("accepted");
      toast.success("Invitation accepted successfully!");
      void logger.info("label_invite_accept_success", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/studio/label");
      }, 2000);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
      void logger.error("label_invite_accept_exception", {
        token_prefix: tokenPrefix,
        user_id: user.id,
      }, toError(error));
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate("/");
    toast.info("Invitation declined");
    void logger.userAction("label_invite_declined", "LabelInvitePage", {
      token_prefix: tokenPrefix,
      user_id: user?.id,
    });
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-muted-foreground">Checking invitation...</p>
            </CardContent>
          </Card>
        );

      case "valid":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Building className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Label Invitation</CardTitle>
              <CardDescription>
                You've been invited to join a label team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold text-lg">{inviteData?.label_name}</p>
                <p className="text-sm text-muted-foreground">
                  Invited by {inviteData?.invited_by_name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">Role:</span>
                  <Badge variant="secondary" className="capitalize">
                    {inviteData?.role}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  disabled={accepting}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "accepted":
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invitation Accepted!</h3>
              <p className="text-muted-foreground text-center">
                You're now a member of {inviteData?.label_name}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting to Label Studio...
              </p>
            </CardContent>
          </Card>
        );

      case "expired":
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invitation Expired</h3>
              <p className="text-muted-foreground text-center mb-4">
                This invitation to join {inviteData?.label_name} has expired.
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Please contact {inviteData?.invited_by_name} for a new invitation.
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        );

      case "already_member":
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Already a Member</h3>
              <p className="text-muted-foreground text-center mb-4">
                You're already a member of {inviteData?.label_name}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm">Current role:</span>
                <Badge variant="secondary" className="capitalize">
                  {inviteData?.role}
                </Badge>
              </div>
              <Button onClick={() => navigate("/studio/label")}>
                Go to Label Studio
              </Button>
            </CardContent>
          </Card>
        );

      case "invalid":
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
              <p className="text-muted-foreground text-center mb-4">
                This invitation link is invalid or has been used.
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="min-h-[60vh] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}