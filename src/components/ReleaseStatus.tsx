import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate } from '@/lib/formatting';
import { useLocalization } from '@/contexts/LocalizationContext';
import { CalendarIcon, Clock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Release {
  id: string;
  title: string;
  artist: string;
  status: 'draft' | 'scheduled' | 'live' | 'rejected';
  approved: boolean;
  scheduled_publish_date?: string;
  created_at: string;
  cover_art_url?: string;
}

interface ReleaseStatusProps {
  release: Release;
  isOwner: boolean;
  onScheduleUpdate?: (releaseId: string, date: Date | null) => void;
}

export const ReleaseStatus = ({ release, isOwner, onScheduleUpdate }: ReleaseStatusProps) => {
  const { settings } = useLocalization();
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    release.scheduled_publish_date ? new Date(release.scheduled_publish_date) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getStatusBadge = () => {
    switch (release.status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="gap-1">
            <EyeOff className="w-3 h-3" />
            Draft
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Scheduled
          </Badge>
        );
      case 'live':
        return (
          <Badge variant="default" className="gap-1">
            <Eye className="w-3 h-3" />
            Live
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getApprovalBadge = () => {
    if (!release.approved) {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Pending Approval
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="w-3 h-3" />
        Approved
      </Badge>
    );
  };

  const handleScheduleSubmit = () => {
    if (onScheduleUpdate && scheduleDate) {
      onScheduleUpdate(release.id, scheduleDate);
      setShowDatePicker(false);
    }
  };

  const handleClearSchedule = () => {
    setScheduleDate(undefined);
    if (onScheduleUpdate) {
      onScheduleUpdate(release.id, null);
    }
    setShowDatePicker(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {getStatusBadge()}
        {getApprovalBadge()}
      </div>

      {release.status === 'scheduled' && release.scheduled_publish_date && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Scheduled to publish on{' '}
            <span className="font-medium">
              {formatDate(new Date(release.scheduled_publish_date), {
                locale: settings.locale,
                timezone: settings.timezone,
                includeTime: true,
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </span>
          </p>
        </div>
      )}

      {isOwner && release.status === 'draft' && release.approved && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publishing Options</CardTitle>
            <CardDescription>
              Choose when to publish your release
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => onScheduleUpdate?.(release.id, new Date())}
                className="flex-1"
              >
                Publish Now
              </Button>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !scheduleDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? formatDate(scheduleDate, {
                      locale: settings.locale,
                      timezone: settings.timezone,
                      dateStyle: 'long'
                    }) : 'Schedule'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  <div className="p-3 border-t space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleDate ? formatDate(scheduleDate, {
                        locale: settings.locale,
                        timezone: settings.timezone,
                        timeStyle: 'short',
                        timeFormat: settings.timeFormat
                      }).match(/\d{1,2}:\d{2}/)?.[0] || '' : ''}
                      onChange={(e) => {
                        if (scheduleDate && e.target.value) {
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = new Date(scheduleDate);
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setScheduleDate(newDate);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleScheduleSubmit} disabled={!scheduleDate}>
                        Schedule
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleClearSchedule}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {!release.approved && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Your release is pending approval. You'll be notified once it's reviewed.
          </p>
        </div>
      )}

      {release.status === 'rejected' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Your release was rejected. Please review and resubmit with any necessary changes.
          </p>
        </div>
      )}
    </div>
  );
};