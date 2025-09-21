import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Plus, X, Edit3, Save, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SuggestedNickname {
  id: string;
  nickname: string;
  category: string;
  icon: string;
  popularity_score: number;
}

interface UserFavNickname {
  nickname: string;
  custom_icon: string;
  display_order: number;
}

interface FavNicknameSelectorProps {
  onComplete?: (nicknames: UserFavNickname[]) => void;
  showTitle?: boolean;
  maxSelections?: number;
  mode?: 'first-run' | 'settings';
}

export const FavNicknameSelector = ({ 
  onComplete, 
  showTitle = true, 
  maxSelections = 3,
  mode = 'settings'
}: FavNicknameSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestedNicknames, setSuggestedNicknames] = useState<SuggestedNickname[]>([]);
  const [selectedNicknames, setSelectedNicknames] = useState<UserFavNickname[]>([]);
  const [customNickname, setCustomNickname] = useState('');
  const [customIcon, setCustomIcon] = useState('🎵');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSuggestedNicknames();
    if (mode === 'settings') {
      fetchUserFavNicknames();
    }
  }, [mode]);

  const fetchSuggestedNicknames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suggested_fav_nicknames')
        .select('*')
        .order('popularity_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSuggestedNicknames(data || []);
    } catch (error) {
      console.error('Error fetching suggested nicknames:', error);
      toast({
        title: "Error",
        description: "Failed to load suggested nicknames",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFavNicknames = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_fav_nicknames')
        .select('nickname, custom_icon, display_order')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setSelectedNicknames(data || []);
    } catch (error) {
      console.error('Error fetching user FAV nicknames:', error);
      toast({
        title: "Error",
        description: "Failed to load your FAV nicknames",
        variant: "destructive",
      });
    }
  };

  const handleSuggestedClick = (suggested: SuggestedNickname) => {
    if (selectedNicknames.length >= maxSelections) {
      toast({
        title: "Maximum reached",
        description: `You can only select up to ${maxSelections} FAV nicknames`,
        variant: "destructive",
      });
      return;
    }

    // Check if already selected
    const isAlreadySelected = selectedNicknames.some(
      (selected) => selected.nickname.toLowerCase() === suggested.nickname.toLowerCase()
    );

    if (isAlreadySelected) {
      toast({
        title: "Already selected",
        description: "This nickname is already in your FAVs",
        variant: "destructive",
      });
      return;
    }

    const newNickname: UserFavNickname = {
      nickname: suggested.nickname,
      custom_icon: suggested.icon,
      display_order: selectedNicknames.length
    };

    setSelectedNicknames([...selectedNicknames, newNickname]);
  };

  const handleCustomAdd = () => {
    if (!customNickname.trim()) {
      toast({
        title: "Invalid nickname",
        description: "Please enter a nickname",
        variant: "destructive",
      });
      return;
    }

    if (selectedNicknames.length >= maxSelections) {
      toast({
        title: "Maximum reached",
        description: `You can only select up to ${maxSelections} FAV nicknames`,
        variant: "destructive",
      });
      return;
    }

    // Check if already selected
    const isAlreadySelected = selectedNicknames.some(
      (selected) => selected.nickname.toLowerCase() === customNickname.trim().toLowerCase()
    );

    if (isAlreadySelected) {
      toast({
        title: "Already selected",
        description: "This nickname is already in your FAVs",
        variant: "destructive",
      });
      return;
    }

    const newNickname: UserFavNickname = {
      nickname: customNickname.trim(),
      custom_icon: customIcon,
      display_order: selectedNicknames.length
    };

    setSelectedNicknames([...selectedNicknames, newNickname]);
    setCustomNickname('');
    setCustomIcon('🎵');
  };

  const handleRemove = (index: number) => {
    const newSelected = selectedNicknames.filter((_, i) => i !== index);
    // Re-order the remaining nicknames
    const reordered = newSelected.map((nickname, i) => ({
      ...nickname,
      display_order: i
    }));
    setSelectedNicknames(reordered);
  };

  const handleEdit = (index: number, newNickname: string, newIcon: string) => {
    const updated = [...selectedNicknames];
    updated[index] = {
      ...updated[index],
      nickname: newNickname,
      custom_icon: newIcon
    };
    setSelectedNicknames(updated);
    setEditingIndex(null);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save FAV nicknames",
        variant: "destructive",
      });
      return;
    }

    if (selectedNicknames.length === 0) {
      toast({
        title: "No nicknames selected",
        description: "Please select at least one FAV nickname",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Convert to the format expected by the database function
      const nicknamesData = selectedNicknames.map((nickname) => ({
        nickname: nickname.nickname,
        custom_icon: nickname.custom_icon
      }));

      const { error } = await supabase.rpc('set_user_fav_nicknames', {
        p_user_id: user.id,
        p_nicknames: nicknamesData
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your FAV nicknames have been saved",
      });

      if (onComplete) {
        onComplete(selectedNicknames);
      }
    } catch (error) {
      console.error('Error saving FAV nicknames:', error);
      toast({
        title: "Error",
        description: "Failed to save your FAV nicknames",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedSuggestions = suggestedNicknames.reduce((acc, nickname) => {
    if (!acc[nickname.category]) {
      acc[nickname.category] = [];
    }
    acc[nickname.category].push(nickname);
    return acc;
  }, {} as Record<string, SuggestedNickname[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading nicknames...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Choose Your FAV Nicknames</h2>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground">
            Select up to {maxSelections} nicknames that represent your musical identity
          </p>
        </div>
      )}

      {/* Selected Nicknames */}
      {selectedNicknames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your FAV Nicknames ({selectedNicknames.length}/{maxSelections})
            </CardTitle>
            <CardDescription>
              These will be displayed on your profile and throughout the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedNicknames.map((nickname, index) => (
                <EditableNicknameBadge
                  key={index}
                  nickname={nickname}
                  isEditing={editingIndex === index}
                  onEdit={(newNickname, newIcon) => handleEdit(index, newNickname, newIcon)}
                  onStartEdit={() => setEditingIndex(index)}
                  onCancelEdit={() => setEditingIndex(null)}
                  onRemove={() => handleRemove(index)}
                  displayOrder={index}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suggested" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggested">Suggested</TabsTrigger>
          <TabsTrigger value="custom">Create Custom</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggested" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Nicknames</CardTitle>
              <CardDescription>
                Choose from our curated list of popular music nicknames
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(groupedSuggestions).map(([category, nicknames]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium capitalize text-muted-foreground">
                    {category} ({nicknames.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {nicknames.map((suggested) => (
                      <Badge
                        key={suggested.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleSuggestedClick(suggested)}
                      >
                        {suggested.icon} {suggested.nickname}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Nickname</CardTitle>
              <CardDescription>
                Make your own unique nickname with a custom icon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="custom-nickname">Nickname</Label>
                  <Input
                    id="custom-nickname"
                    value={customNickname}
                    onChange={(e) => setCustomNickname(e.target.value)}
                    placeholder="Enter your custom nickname"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-icon">Icon</Label>
                  <Input
                    id="custom-icon"
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    placeholder="🎵"
                    className="w-16 text-center"
                    maxLength={4}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCustomAdd} 
                disabled={!customNickname.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Nickname
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSave} 
          disabled={selectedNicknames.length === 0 || saving}
          size="lg"
          className="min-w-[200px]"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {mode === 'first-run' ? 'Complete Setup' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

// Component for editable nickname badges
const EditableNicknameBadge = ({
  nickname,
  isEditing,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onRemove,
  displayOrder
}: {
  nickname: UserFavNickname;
  isEditing: boolean;
  onEdit: (nickname: string, icon: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  displayOrder: number;
}) => {
  const [editNickname, setEditNickname] = useState(nickname.nickname);
  const [editIcon, setEditIcon] = useState(nickname.custom_icon);

  const handleSave = () => {
    if (editNickname.trim()) {
      onEdit(editNickname.trim(), editIcon);
    }
  };

  const handleCancel = () => {
    setEditNickname(nickname.nickname);
    setEditIcon(nickname.custom_icon);
    onCancelEdit();
  };

  const getPriorityLabel = (order: number) => {
    switch (order) {
      case 0: return 'Primary';
      case 1: return 'Secondary';
      case 2: return 'Tertiary';
      default: return '';
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
        <Input
          value={editIcon}
          onChange={(e) => setEditIcon(e.target.value)}
          className="w-12 h-8 text-center p-1"
          maxLength={4}
        />
        <Input
          value={editNickname}
          onChange={(e) => setEditNickname(e.target.value)}
          className="h-8 min-w-[120px]"
          maxLength={50}
        />
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Save className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Badge 
        variant={displayOrder === 0 ? "default" : "secondary"}
        className="pr-8 py-1 text-sm"
      >
        {nickname.custom_icon} {nickname.nickname}
        {displayOrder === 0 && (
          <span className="ml-1 text-xs opacity-75">({getPriorityLabel(displayOrder)})</span>
        )}
      </Badge>
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-600"
          onClick={onStartEdit}
        >
          <Edit3 className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default FavNicknameSelector;