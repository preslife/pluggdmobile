import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, Mail, Users } from 'lucide-react';
import { NotificationPreferenceKey, useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { type ComponentType, type SVGProps, useMemo } from 'react';

interface NotificationPreferencesProps {
  variant?: 'full' | 'compact';
  className?: string;
}

interface PreferenceDefinition {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
  showInCompact?: boolean;
}

interface PreferenceSection {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: PreferenceDefinition[];
}

const preferenceSections: PreferenceSection[] = [
  {
    id: 'real-time',
    title: 'Real-time alerts',
    description: 'Control the alerts that appear instantly in the app or via push notifications.',
    icon: Bell,
    items: [
      {
        key: 'notify_push',
        label: 'Push notifications',
        description: 'Send push notifications to my browser or device when important activity happens.',
        showInCompact: true,
      },
      {
        key: 'notify_live_sessions',
        label: 'Live session reminders',
        description: 'Remind me about live sessions I am hosting or attending before they begin.',
        showInCompact: true,
      },
      {
        key: 'notify_contest_reminders',
        label: 'Contest reminders',
        description: 'Send a nudge when contests I follow or join are starting soon.',
        showInCompact: true,
      },
    ],
  },
  {
    id: 'engagement',
    title: 'Engagement activity',
    description: 'Choose which fan and collaborator events should create in-app notifications.',
    icon: Users,
    items: [
      {
        key: 'notify_supporters',
        label: 'New supporters',
        description: 'Alert me when someone backs my campaigns or subscriptions.',
      },
      {
        key: 'notify_purchases',
        label: 'Product purchases',
        description: 'Notify me about new purchases for releases, packs, or merch.',
      },
      {
        key: 'notify_follows',
        label: 'New followers',
        description: 'Let me know when fans start following my profile.',
      },
      {
        key: 'notify_session_feedback',
        label: 'Session feedback',
        description: 'Alert me when attendees leave ratings or feedback on sessions.',
      },
    ],
  },
  {
    id: 'email',
    title: 'Email updates',
    description: 'Manage occasional marketing and product emails from Pluggd.',
    icon: Mail,
    items: [
      {
        key: 'notify_email_marketing',
        label: 'Product announcements & campaigns',
        description: 'Receive occasional emails about feature launches, promotions, and major updates.',
      },
    ],
  },
];

const compactFallback = new Set<NotificationPreferenceKey>([
  'notify_push',
  'notify_live_sessions',
  'notify_contest_reminders',
]);

const renderLoading = () => (
  <Card>
    <CardHeader>
      <CardTitle>Notification preferences</CardTitle>
      <CardDescription>Loading your saved settings…</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const shouldRenderItem = (variant: 'full' | 'compact', item: PreferenceDefinition) => {
  if (variant === 'full') {
    return true;
  }
  if (item.showInCompact) {
    return true;
  }
  return compactFallback.has(item.key);
};

const NotificationPreferencesCard = ({
  variant = 'full',
  className,
}: NotificationPreferencesProps) => {
  const { preferences, loading, error, updating, updatePreference, refresh } = useNotificationPreferences();

  const sections = useMemo(() => {
    if (variant === 'full') {
      return preferenceSections;
    }

    return preferenceSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => shouldRenderItem(variant, item)),
      }))
      .filter((section) => section.items.length > 0);
  }, [variant]);

  if (loading && !preferences) {
    return renderLoading();
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Decide which events should reach you by push notification, in-app alert, or marketing email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-none">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="space-y-4 rounded-lg border bg-card/40 p-4">
                {section.items.map((item) => {
                  const checked = preferences ? preferences[item.key] : true;
                  const isUpdating = updating.has(item.key);

                  return (
                    <div key={item.key} className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor={item.key} className="text-sm font-medium">
                          {item.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        id={item.key}
                        checked={checked}
                        onCheckedChange={(value) => updatePreference(item.key, value)}
                        disabled={isUpdating}
                        aria-label={item.label}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export const NotificationPreferences = (props: NotificationPreferencesProps) => {
  return <NotificationPreferencesCard {...props} />;
};

export type { NotificationPreferencesProps };
