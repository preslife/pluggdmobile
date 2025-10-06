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

type SplitStatus = 'accepted' | 'pending' | 'declined';

interface CollaboratorRow {
  id?: string;
  payee_user_id: string;
  percent: number;
  payee_email?: string;
  payee_name?: string;
  status: SplitStatus;
  type: 'split' | 'offer';
  responded_at?: string | null;
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
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);

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

      const formattedSplits: CollaboratorRow[] = data.map(split => ({
        id: split.id,
        payee_user_id: split.payee_user_id,
        percent: Number(split.percent),
        payee_name: (split.profiles as any)?.full_name || (split.profiles as any)?.username || 'Unknown User',
        status: 'accepted',
        type: 'split'
      }));

      const { data: offers, error: offersError } = await supabase
        .from('content_split_offers')
        .select(`
          id,
          payee_user_id,
          payee_email,
          percent,
          status,
          responded_at
        `)
        .eq('content_type', item.type)
        .eq('content_id', item.id);

      if (offersError) throw offersError;

      const formattedOffers: CollaboratorRow[] = (offers || []).map(offer => ({
        id: offer.id,
        payee_user_id: offer.payee_user_id,
        percent: Number(offer.percent),
        payee_email: offer.payee_email || undefined,
        payee_name: offer.payee_email || offer.payee_user_id,
        status: (offer.status || 'pending') as SplitStatus,
        type: 'offer',
        responded_at: offer.responded_at
      }));

      setCollaborators([...formattedSplits, ...formattedOffers]);

      const { data: lockData } = await supabase.rpc('content_has_orders', {
        p_content_type: item.type,
        p_content_id: item.id
      });

      setLocked(Boolean(lockData));
    } catch (error) {
      console.error('Error loading splits:', error);
      toast.error('Failed to load splits');
    }
  };

  // Add new split row
  const addSplit = () => {
    setCollaborators([
      ...collaborators,
      {
        payee_user_id: '',
        percent: 0,
        payee_email: '',
        status: 'pending',
        type: 'offer'
      }
    ]);
  };

  // Remove split
  const removeSplit = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  // Update split
  const updateSplit = (index: number, field: keyof CollaboratorRow, value: any) => {
    const newSplits = [...collaborators];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setCollaborators(newSplits);
  };

  // Save splits
  const saveSplits = async () => {
    if (!selectedItem || !user) return;

    if (locked) {
      toast.error('This content has active orders and its splits are locked.');
      return;
    }

    const totalPercent = collaborators.reduce((sum, split) => sum + (split.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      toast.error('Total percentage must equal 100%');
      return;
    }

    setSaving(true);
    try {
      // Delete existing splits and pending offers
      await supabase
        .from('content_splits')
        .delete()
        .eq('content_type', selectedItem.type)
        .eq('content_id', selectedItem.id);

      await supabase
        .from('content_split_offers')
        .delete()
        .eq('content_type', selectedItem.type)
        .eq('content_id', selectedItem.id);

      const acceptedSplits = collaborators.filter(split => split.status === 'accepted');
      const pendingOffers = collaborators.filter(split => split.status !== 'accepted');

      if (acceptedSplits.length > 0) {
        const { error: splitError } = await supabase.from('content_splits').insert(
          acceptedSplits.map(split => ({
            content_type: selectedItem.type,
            content_id: selectedItem.id,
            payee_user_id: split.payee_user_id,
            percent: split.percent
          }))
        );
        if (splitError) throw splitError;
      }

      if (pendingOffers.length > 0) {
        const { error: offerError } = await supabase.from('content_split_offers').insert(
          pendingOffers.map(split => ({
            content_type: selectedItem.type,
            content_id: selectedItem.id,
            proposer_user_id: user.id,
            payee_user_id: split.payee_user_id,
            payee_email: split.payee_email || null,
            percent: split.percent,
            status: 'pending'
          }))
        );
        if (offerError) throw offerError;
      }

      toast.success('Splits saved successfully');

      // Refresh content list to update status
      loadContent();
      loadSplits(selectedItem);
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
      case 'awaiting_approvals':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Awaiting Approvals</Badge>;
      case 'locked':
        return <Badge variant="destructive">Locked</Badge>;
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
              {collaborators.map((split, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="User ID"
                    value={split.payee_user_id}
                    onChange={(e) => updateSplit(index, 'payee_user_id', e.target.value)}
                    className="flex-1"
                    disabled={split.status === 'accepted' || locked}
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
                    disabled={split.status === 'accepted' || locked}
                  />
                  {split.type === 'offer' && (
                    <Input
                      placeholder="Collaborator email (optional)"
                      value={split.payee_email || ''}
                      onChange={(e) => updateSplit(index, 'payee_email', e.target.value)}
                      className="flex-1"
                      disabled={locked}
                    />
                  )}
                  <Badge variant={split.status === 'accepted' ? 'default' : split.status === 'declined' ? 'destructive' : 'outline'}>
                    {split.status === 'accepted' ? 'Accepted' : split.status === 'declined' ? 'Declined' : 'Pending'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(index)}
                    disabled={split.status === 'accepted' || locked}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" onClick={addSplit} className="flex items-center gap-2" disabled={locked}>
                  <Plus className="h-4 w-4" />
                  Add Collaborator
                </Button>
                <div className="text-sm">
                  Total: {collaborators.reduce((sum, split) => sum + split.percent, 0).toFixed(2)}%
                </div>
              </div>

              <Button
                onClick={saveSplits}
                disabled={
                  locked ||
                  saving ||
                  Math.abs(collaborators.reduce((sum, split) => sum + split.percent, 0) - 100) > 0.01
                }
                className="w-full flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Splits'}
              </Button>
              {locked && (
                <p className="text-sm text-muted-foreground text-center">
                  Splits are locked because orders exist for this content. Reach out to support if adjustments are required.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};