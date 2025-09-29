import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { MoreVertical, UserPlus, Mail, Shield, Copy, Check } from "lucide-react";
import { toast as sonnerToast } from "sonner";

type Member = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  joined_at?: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  token: string;
};

export default function LabelRosterModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { label: activeLabel } = useActiveLabel();
  const labelId = activeLabel?.id || null;
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [selectedRole, setSelectedRole] = useState("editor");
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const canManage = useMemo(() => {
    if (!labelId) return false;
    const role = activeLabel?.role ?? null;
    return role === 'owner' || role === 'admin';
  }, [activeLabel?.role, labelId]);

  const canChangeRoles = useMemo(() => {
    if (!labelId) return false;
    const role = activeLabel?.role ?? null;
    return role === 'owner' || role === 'admin';
  }, [activeLabel?.role, labelId]);

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'editor': return 'outline';
      default: return 'ghost';
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!user) { setLoading(false); return; }
      if (!labelId) { setLoading(false); return; }
      try {
        const [{ data: roster, error: rosterErr }, { data: invites, error: inviteErr }] = await Promise.all([
          supabase.rpc("label_roster", { p_label_id: labelId }),
          supabase.rpc("label_pending_invites", { p_label_id: labelId })
        ]);

        if (rosterErr) throw rosterErr;
        if (inviteErr) throw inviteErr;

        setMembers((roster || []).map((row: any) => ({
          user_id: row.member_user_id,
          username: row.username ?? null,
          full_name: row.full_name ?? null,
          avatar_url: row.avatar_url ?? null,
          role: row.member_role ?? null,
          joined_at: row.joined_at,
        })));

        setPendingInvites((invites || []).map((row: any) => ({
          id: row.invitation_id,
          email: row.email,
          role: row.invite_role,
          expires_at: row.expires_at,
          token: row.token,
        })));
      } catch (err: any) {
        toast({
          title: "Failed to load roster",
          description: err.message || String(err),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.id, labelId, toast]);

  const handleChangeRole = async (memberUserId: string, newRole: string) => {
    if (!canChangeRoles || !labelId) return;

    try {
      const { error } = await supabase
        .from("label_members")
        .update({ role: newRole })
        .match({ label_id: labelId, user_id: memberUserId });

      if (error) throw error;

      toast({ title: "Role updated successfully" });
      await loadMembers(labelId);
    } catch (err: any) {
      toast({
        title: "Failed to update role",
        description: err.message || String(err),
        variant: "destructive"
      });
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/labels/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(token);
    sonnerToast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedInvite(null), 3000);
  };

  const sendInviteEmail = async (payload: { id: string; email: string; token: string; role: string; labelName?: string | null }) => {
    try {
      const inviteUrl = `${window.location.origin}/labels/invite/${payload.token}`;

      const { error } = await supabase.functions.invoke('send-lifecycle-emails', {
        body: {
          user_id: user?.id ?? null,
          email_type: 'label_team_invite',
          user_data: {
            invitee_email: payload.email,
            invite_url: inviteUrl,
            label_name: payload.labelName || activeLabel?.name || 'Label team',
            role: payload.role,
          },
        },
      });

      if (error) {
        console.error('[LabelRoster] invite email failed', error);
        toast({
          title: 'Invite created (email pending)',
          description: 'The invitation was refreshed but the email could not be sent. Share the link manually.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Invitation emailed', description: `Invite sent to ${payload.email}` });
      }
    } catch (err: any) {
      console.error('[LabelRoster] invite email error', err);
      toast({
        title: 'Invite email failed',
        description: err?.message || 'Share the invite link manually.',
        variant: 'destructive',
      });
    }
  };

  const resendInvite = async (inviteId: string, email: string) => {
    try {
      const { data, error } = await supabase.rpc("resend_label_invite", {
        p_invitation_id: inviteId
      });

      if (error) throw error;

      const inviteRow = Array.isArray(data) ? data[0] : data;
      const newToken = inviteRow?.token;
      const inviteMeta = pendingInvites.find((invite) => invite.id === inviteId);

      if (newToken) {
        await sendInviteEmail({
          id: inviteId,
          email,
          token: newToken,
          role: inviteMeta?.role || selectedRole,
          labelName: activeLabel?.name,
        });
      } else {
        toast({ title: "Invitation refreshed", description: `New token generated for ${email}` });
      }

      await loadPendingInvites(labelId!);
    } catch (err: any) {
      toast({
        title: "Failed to resend invite",
        description: err.message || String(err),
        variant: "destructive"
      });
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("label_invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast({ title: "Invitation cancelled" });
      await loadPendingInvites(labelId!);
    } catch (err: any) {
      toast({
        title: "Failed to cancel invite",
        description: err.message || String(err),
        variant: "destructive"
      });
    }
  };

  const handleAdd = async () => {
    if (!canManage) return;
    if (!usernameToAdd.trim()) {
      toast({ title: "Enter a username", variant: "destructive" });
      return;
    }
    try {
      setAdding(true);
      const trimmed = usernameToAdd.trim();
      if (trimmed.includes("@")) {
        const { data: inviteRows, error: inviteErr } = await supabase.rpc("invite_label_member", {
          p_label_id: labelId,
          p_email: trimmed,
          p_role: selectedRole,
        });
        if (inviteErr) throw inviteErr;
        const createdInvite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
        if (createdInvite?.token) {
          await sendInviteEmail({
            id: createdInvite.invitation_id ?? createdInvite.id,
            email: trimmed,
            token: createdInvite.token,
            role: selectedRole,
            labelName: activeLabel?.name,
          });
        } else {
          toast({ title: "Invitation created", description: `Share the invite link with ${trimmed}.` });
        }
        setUsernameToAdd("");
        await loadPendingInvites(labelId!);
      } else {
        // Lookup by username to get user_id
        const { data: profile, error: findErr } = await supabase
          .from("profiles")
          .select("user_id, username")
          .eq("username", trimmed)
          .single();
        if (findErr) throw findErr;

        const { error: upsertErr } = await supabase
          .from("label_members")
          .upsert([{ label_id: labelId, user_id: profile.user_id, role: selectedRole }], { onConflict: "label_id,user_id" });
        if (upsertErr) throw upsertErr;
        toast({ title: "Added to roster", description: `@${profile.username} added.` });
        setUsernameToAdd("");
        await loadMembers(labelId!);
      }
    } catch (err: any) {
      toast({ title: "Could not add member", description: err.message || String(err), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberUserId: string) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from("label_members")
        .delete()
        .match({ label_id: labelId, user_id: memberUserId });
      if (error) throw error;
      toast({ title: "Removed from roster" });
      await loadMembers(labelId!);
    } catch (err: any) {
      toast({ title: "Could not remove member", description: err.message || String(err), variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-4"><h2 className="text-2xl font-semibold">Roster</h2><p>Loading...</p></div>;
  }

  if (!labelId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Roster</h2>
        <p className="text-muted-foreground">No label selected. Create a label in the Label Studio overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Roster</h2>
        <p className="text-muted-foreground">Add existing users by username or send an email invitation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Team Member</CardTitle>
          <CardDescription>
            Invite by email or add existing users by username
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-xl">
            <Input
              placeholder="Email or @username"
              value={usernameToAdd}
              onChange={(e) => setUsernameToAdd(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="capitalize">
                  {selectedRole}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedRole("viewer")}>Viewer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("editor")}>Editor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("admin")}>Admin</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAdd} disabled={adding || !canManage}>
              {adding ? "Adding..." : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} active member{members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback>
                        {(m.full_name || m.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {m.full_name || m.username || "Unknown User"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{m.username || "unknown"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(m.role)} className="capitalize">
                      {m.role === "owner" && <Shield className="h-3 w-3 mr-1" />}
                      {m.role || "member"}
                    </Badge>
                    {canManage && m.user_id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canChangeRoles && m.role !== "owner" && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRole(m.user_id, "viewer")}>
                                Change to Viewer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(m.user_id, "editor")}>
                                Change to Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(m.user_id, "admin")}>
                                Change to Admin
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setMemberToRemove(m.user_id)}
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invitation{pendingInvites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {invite.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyInviteLink(invite.token)}
                    >
                      {copiedInvite === invite.token ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => resendInvite(invite.id, invite.email)}>
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyInviteLink(invite.token)}>
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => cancelInvite(invite.id)}
                          >
                            Cancel Invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the label? They will lose access to all label resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToRemove) {
                  handleRemove(memberToRemove);
                  setMemberToRemove(null);
                }
              }}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
