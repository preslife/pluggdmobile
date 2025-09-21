import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSplitsParams } from "@/hooks/useSplitsParams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Users } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  type: 'beat' | 'release' | 'pack';
  splitStatus: string;
}

interface Split {
  id?: string;
  payee_user_id: string;
  percent: number;
  payee_email?: string;
  payee_name?: string;
}

interface SplitsManagerProps {
  selectedContent?: { id: string; type: string; title: string };
  onClose?: () => void;
}

export const SplitsManager = ({ onClose }: { onClose?: () => void }) => {
  const { user } = useAuth();
  const { selectedContent: deepLinkContent } = useSplitsParams();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user's content with split status
  const loadContent = async () => {
    if (!user) return;

    try {
      const [beatsRes, releasesRes, packsRes] = await Promise.all([
        supabase.from('beats').select('id, title').eq('user_id', user.id),
        supabase.from('releases').select('id, title').eq('user_id', user.id),
        supabase.from('sample_packs').select('id, title').eq('user_id', user.id)
      ]);

      const items: ContentItem[] = [];

      // Add beats
      if (beatsRes.data) {
        for (const beat of beatsRes.data) {
          const { data: statusData } = await supabase.rpc('get_content_split_status', {
            p_content_type: 'beat',
            p_content_id: beat.id
          });
          items.push({
            id: beat.id,
            title: beat.title,
            type: 'beat',
            splitStatus: (statusData as string) || 'not_set'
          });
        }
      }

      // Add releases
      if (releasesRes.data) {
        for (const release of releasesRes.data) {
          const { data: statusData } = await supabase.rpc('get_content_split_status', {
            p_content_type: 'release',
            p_content_id: release.id
          });
          items.push({
            id: release.id,
            title: release.title,
            type: 'release',
            splitStatus: (statusData as string) || 'not_set'
          });
        }
      }

      // Add packs
      if (packsRes.data) {
        for (const pack of packsRes.data) {
          const { data: statusData } = await supabase.rpc('get_content_split_status', {
            p_content_type: 'pack',
            p_content_id: pack.id
          });
          items.push({
            id: pack.id,
            title: pack.title,
            type: 'pack',
            splitStatus: (statusData as string) || 'not_set'
          });
        }
      }

      setContentItems(items);

      // Auto-select if coming from deep link
      if (deepLinkContent) {
        const item = items.find(i => i.id === deepLinkContent.id && i.type === deepLinkContent.type);
        if (item) {
          setSelectedItem(item);
          loadSplits(item);
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Load splits for selected content
  const loadSplits = async (item: ContentItem) => {
    try {
      const { data, error } = await supabase
        .from('content_splits')
        .select(`
          id,
          payee_user_id,
          percent,
          profiles!inner(full_name, username)
        `)
        .eq('content_type', item.type)
        .eq('content_id', item.id);

      if (error) throw error;

      const formattedSplits = data.map(split => ({
        id: split.id,
        payee_user_id: split.payee_user_id,
        percent: Number(split.percent),
        payee_name: (split.profiles as any)?.full_name || (split.profiles as any)?.username || 'Unknown User'
      }));

      setSplits(formattedSplits);
    } catch (error) {
      console.error('Error loading splits:', error);
      toast.error('Failed to load splits');
    }
  };

  // Add new split row
  const addSplit = () => {
    setSplits([...splits, { payee_user_id: '', percent: 0 }]);
  };

  // Remove split
  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  // Update split
  const updateSplit = (index: number, field: keyof Split, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  // Save splits
  const saveSplits = async () => {
    if (!selectedItem || !user) return;

    const totalPercent = splits.reduce((sum, split) => sum + split.percent, 0);
    if (totalPercent !== 100) {
      toast.error('Total percentage must equal 100%');
      return;
    }

    setSaving(true);
    try {
      // Delete existing splits
      await supabase
        .from('content_splits')
        .delete()
        .eq('content_type', selectedItem.type)
        .eq('content_id', selectedItem.id);

      // Insert new splits
      const { error } = await supabase
        .from('content_splits')
        .insert(
          splits.map(split => ({
            content_type: selectedItem.type,
            content_id: selectedItem.id,
            payee_user_id: split.payee_user_id,
            percent: split.percent
          }))
        );

      if (error) throw error;

      toast.success('Splits saved successfully');
      
      // Refresh content list to update status
      loadContent();
    } catch (error) {
      console.error('Error saving splits:', error);
      toast.error('Failed to save splits');
    } finally {
      setSaving(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-500 text-white">Complete (100%)</Badge>;
      case 'incomplete':
        return <Badge variant="secondary">Incomplete</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  useEffect(() => {
    loadContent();
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Royalty Splits Manager</h1>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedItem?.id === item.id && selectedItem?.type === item.type
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => {
                  setSelectedItem(item);
                  loadSplits(item);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  {getStatusBadge(item.splitStatus)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Splits Editor */}
        {selectedItem && (
          <Card>
            <CardHeader>
              <CardTitle>Splits for "{selectedItem.title}"</CardTitle>
              <p className="text-sm text-muted-foreground">
                Define how revenue will be split between collaborators
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {splits.map((split, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="User ID or email"
                    value={split.payee_user_id}
                    onChange={(e) => updateSplit(index, 'payee_user_id', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Percent"
                    min="0"
                    max="100"
                    step="0.01"
                    value={split.percent}
                    onChange={(e) => updateSplit(index, 'percent', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" onClick={addSplit} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Collaborator
                </Button>
                <div className="text-sm">
                  Total: {splits.reduce((sum, split) => sum + split.percent, 0).toFixed(2)}%
                </div>
              </div>

              <Button 
                onClick={saveSplits} 
                disabled={saving || splits.reduce((sum, split) => sum + split.percent, 0) !== 100}
                className="w-full flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Splits'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};