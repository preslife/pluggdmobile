import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlugAutomation, type AutomationType } from '@/hooks/usePlugAutomation';

interface CreateAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAutomationModal = ({ open, onOpenChange }: CreateAutomationModalProps) => {
  const { createSchedule } = usePlugAutomation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [automationType, setAutomationType] = useState<AutomationType>('scheduled_post');
  const [frequency, setFrequency] = useState('once');

  // Scheduled Post fields
  const [postContent, setPostContent] = useState('');
  const [mediaPath, setMediaPath] = useState('');

  // Auto Reply fields
  const [triggerPhrases, setTriggerPhrases] = useState('');
  const [replyText, setReplyText] = useState('');

  // Smart Drop fields
  const [releaseId, setReleaseId] = useState('');
  const [publishDate, setPublishDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setAutomationType('scheduled_post');
    setFrequency('once');
    setPostContent('');
    setMediaPath('');
    setTriggerPhrases('');
    setReplyText('');
    setReleaseId('');
    setPublishDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let configJson: any = { frequency };
      let nextRunAt = null;

      switch (automationType) {
        case 'scheduled_post':
          configJson = {
            ...configJson,
            content: postContent,
            media_path: mediaPath || null,
          };
          break;
        case 'auto_reply':
          configJson = {
            ...configJson,
            trigger_phrases: triggerPhrases.split(',').map(p => p.trim()),
            reply_text: replyText,
          };
          break;
        case 'smart_drop':
          configJson = {
            ...configJson,
            release_id: releaseId,
          };
          nextRunAt = publishDate ? new Date(publishDate).toISOString() : null;
          break;
      }

      if (frequency !== 'once' && !nextRunAt) {
        nextRunAt = new Date(Date.now() + 60000).toISOString(); // Start in 1 minute
      }

      await createSchedule({
        title,
        automation_type: automationType,
        config_json: configJson,
        is_enabled: true,
        next_run_at: nextRunAt,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating automation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Automation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Automation Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Daily motivation posts"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Automation Type</Label>
              <Select value={automationType} onValueChange={(value: AutomationType) => setAutomationType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select automation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled_post">Scheduled Post</SelectItem>
                  <SelectItem value="auto_reply">Auto Reply</SelectItem>
                  <SelectItem value="smart_drop">Smart Drop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Automation-specific configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {automationType === 'scheduled_post' && (
                <>
                  <div>
                    <Label htmlFor="content">Post Content</Label>
                    <Textarea
                      id="content"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="What would you like to post?"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="media">Media Path (optional)</Label>
                    <Input
                      id="media"
                      value={mediaPath}
                      onChange={(e) => setMediaPath(e.target.value)}
                      placeholder="e.g., path/to/image.jpg"
                    />
                  </div>
                </>
              )}

              {automationType === 'auto_reply' && (
                <>
                  <div>
                    <Label htmlFor="triggers">Trigger Phrases</Label>
                    <Input
                      id="triggers"
                      value={triggerPhrases}
                      onChange={(e) => setTriggerPhrases(e.target.value)}
                      placeholder="e.g., hey, hello, what's up (comma separated)"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Separate multiple phrases with commas
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="reply">Auto Reply Text</Label>
                    <Textarea
                      id="reply"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Thanks for reaching out! I'll get back to you soon."
                      required
                    />
                  </div>
                </>
              )}

              {automationType === 'smart_drop' && (
                <>
                  <div>
                    <Label htmlFor="release">Release ID</Label>
                    <Input
                      id="release"
                      value={releaseId}
                      onChange={(e) => setReleaseId(e.target.value)}
                      placeholder="UUID of the release to publish"
                      required
                    />
                  </div>
                  {frequency === 'once' && (
                    <div>
                      <Label htmlFor="publishDate">Publish Date & Time</Label>
                      <Input
                        id="publishDate"
                        type="datetime-local"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Automation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};