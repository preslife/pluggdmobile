import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, MapPin, Calendar, Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatorPerksTab } from "@/components/CreatorPerksTab";
import { usePageMetadata } from "@/hooks/usePageMetadata";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
  user_type: "artist" | "producer" | "industry";
}

const UserProfile = () => {
  const { userId, username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: "",
    username: "",
    bio: "",
  });

  const isOwnProfile = profile ? user?.id === profile.user_id : user?.id === userId;

  const profileName = profile?.full_name || profile?.username || 'Pluggd Member';
  const metaDescription = profile?.bio
    ? profile.bio.slice(0, 160)
    : 'View creator profiles, releases, and perks across the Pluggd community.';
  const canonicalPath = userId ? `/user/${userId}` : username ? `/u/${username}` : '/user';

  usePageMetadata({
    title: `${profileName} — Pluggd Profile`,
    description: metaDescription,
    path: canonicalPath,
    image: profile?.avatar_url ?? undefined,
  });

  useEffect(() => {
    fetchProfile();
  }, [userId, username]);

  const fetchProfile = async () => {
    if (!userId && !username) return;
    
    setLoading(true);
    try {
      // Support both username and userId lookup
      let profileQuery = supabase.from("profiles").select("*");
      
      if (username) {
        profileQuery = profileQuery.eq("username", username);
      } else if (userId) {
        profileQuery = profileQuery.eq("user_id", userId);
      }

      const { data, error } = await profileQuery.single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
      setEditData({
        full_name: data.full_name || "",
        username: data.username || "",
        bio: data.bio || "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(editData)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {profile.full_name?.charAt(0) || profile.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {editing ? (
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                      placeholder="Full name"
                      className="text-2xl font-bold border-0 p-0 h-auto"
                    />
                  ) : (
                    profile.full_name || "Anonymous User"
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {editing ? (
                    <Input
                      value={editData.username}
                      onChange={(e) => setEditData({...editData, username: e.target.value})}
                      placeholder="username"
                      className="text-sm border-0 p-0 h-auto"
                    />
                  ) : (
                    <span>@{profile.username || "no-username"}</span>
                  )}
                  {profile.is_creator && <Badge variant="secondary"><Music className="h-3 w-3 mr-1" />Creator</Badge>}
                </div>
              </div>
            </div>
            {isOwnProfile && (
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            {editing ? (
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            ) : (
              <p className="text-muted-foreground">
                {profile.bio || "No bio provided."}
              </p>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>

          {profile.is_creator && !editing && (
            <>
              <Separator />
              <Tabs defaultValue="about" className="mt-6">
                <TabsList>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="perks">Creator Perks</TabsTrigger>
                </TabsList>
                <TabsContent value="about" className="mt-4">
                  <div className="flex gap-2">
                    <Button onClick={() => navigate(`/creator/${profile.username || profile.user_id}`)}>
                      View Creator Profile
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="perks" className="mt-4">
                  <CreatorPerksTab creatorId={profile.user_id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;