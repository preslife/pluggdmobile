import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Mail,
  Globe,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Clock,
  Volume2,
  VolumeX,
  BellRing,
  BellOff,
  MessageSquare,
  BookOpen,
  Trophy,
  Calendar,
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface SettingsState {
  profile: {
    name: string;
    email: string;
    avatar: string;
    title: string;
    bio: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    courseUpdates: boolean;
    discussionReplies: boolean;
    achievementAlerts: boolean;
    weeklyDigest: boolean;
    systemAlerts: boolean;
    securityNotifications: boolean;
    reminderNotifications: boolean;
    socialNotifications: boolean;
    courseReminders: boolean;
    assignmentDueDates: boolean;
    streakMilestones: boolean;
    progressUpdates: boolean;
    doNotDisturb: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    notificationSound: boolean;
    desktopNotifications: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showProgress: boolean;
    showAchievements: boolean;
    allowMessages: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    animations: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  system: {
    language: string;
    timezone: string;
    dateFormat: string;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    profile: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
      title: 'Senior Developer',
      bio: 'Passionate about learning and building great products.'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      courseUpdates: true,
      discussionReplies: false,
      achievementAlerts: true,
      weeklyDigest: true,
      systemAlerts: true,
      securityNotifications: true,
      reminderNotifications: true,
      socialNotifications: true,
      courseReminders: true,
      assignmentDueDates: true,
      streakMilestones: true,
      progressUpdates: true,
      doNotDisturb: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      notificationSound: true,
      desktopNotifications: true
    },
    privacy: {
      profileVisibility: 'public',
      showProgress: true,
      showAchievements: true,
      allowMessages: true
    },
    appearance: {
      theme: 'system',
      compactMode: false,
      animations: true,
      fontSize: 'medium'
    },
    system: {
      language: 'en-US',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      backupFrequency: 'weekly'
    }
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateSettings = (section: keyof SettingsState, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const saveSettings = () => {
    // In a real app, this would make an API call
    toast.success('Settings saved successfully!', {
      description: 'Your preferences have been updated.'
    });
    setHasUnsavedChanges(false);
  };

  const resetSettings = () => {
    toast.info('Settings reset to defaults', {
      description: 'All settings have been restored to their default values.'
    });
    setHasUnsavedChanges(false);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lms-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50/30 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and system configuration
          </p>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-300">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={saveSettings} disabled={!hasUnsavedChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="profile" className="h-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <div className="h-full overflow-auto">
            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={settings.profile.avatar} />
                      <AvatarFallback className="text-2xl">
                        {settings.profile.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" className="mr-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Photo
                      </Button>
                      <Button variant="ghost">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={settings.profile.name}
                        onChange={(e) => updateSettings('profile', 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateSettings('profile', 'email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Professional Title</Label>
                      <Input
                        id="title"
                        value={settings.profile.title}
                        onChange={(e) => updateSettings('profile', 'title', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm resize-none"
                      rows={3}
                      value={settings.profile.bio}
                      onChange={(e) => updateSettings('profile', 'bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 mt-0">
              {/* Delivery Methods */}
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Delivery Methods
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Push Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get instant notifications on your device
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'pushNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Desktop Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications in your browser or desktop app
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.desktopNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications', 'desktopNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {settings.notifications.notificationSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        Notification Sounds
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when receiving notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.notificationSound}
                      onCheckedChange={(checked) => updateSettings('notifications', 'notificationSound', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Categories */}
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5" />
                    Notification Categories
                  </CardTitle>
                  <CardDescription>
                    Control which types of notifications you receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          Course Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          New lessons and course announcements
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.courseUpdates}
                        onCheckedChange={(checked) => updateSettings('notifications', 'courseUpdates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Achievement Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Badges, streaks, and milestones
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.achievementAlerts}
                        onCheckedChange={(checked) => updateSettings('notifications', 'achievementAlerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          Social Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Discussion replies and mentions
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.socialNotifications}
                        onCheckedChange={(checked) => updateSettings('notifications', 'socialNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <SettingsIcon className="h-4 w-4 text-gray-500" />
                          System Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Platform updates and maintenance
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.systemAlerts}
                        onCheckedChange={(checked) => updateSettings('notifications', 'systemAlerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-red-500" />
                          Security Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Login alerts and security updates
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.securityNotifications}
                        onCheckedChange={(checked) => updateSettings('notifications', 'securityNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-500" />
                          Reminder Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Study reminders and due dates
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.reminderNotifications}
                        onCheckedChange={(checked) => updateSettings('notifications', 'reminderNotifications', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Notifications */}
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Learning Notifications
                  </CardTitle>
                  <CardDescription>
                    Customize your learning experience notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-500" />
                          Progress Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Course completion milestones
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.progressUpdates}
                        onCheckedChange={(checked) => updateSettings('notifications', 'progressUpdates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Streak Milestones
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Daily learning streak achievements
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.streakMilestones}
                        onCheckedChange={(checked) => updateSettings('notifications', 'streakMilestones', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          Course Reminders
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Gentle reminders to continue learning
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.courseReminders}
                        onCheckedChange={(checked) => updateSettings('notifications', 'courseReminders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Assignment Due Dates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Alerts for upcoming deadlines
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.assignmentDueDates}
                        onCheckedChange={(checked) => updateSettings('notifications', 'assignmentDueDates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-green-500" />
                          Weekly Digest
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Weekly summary of your progress
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.weeklyDigest}
                        onCheckedChange={(checked) => updateSettings('notifications', 'weeklyDigest', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Do Not Disturb */}
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {settings.notifications.doNotDisturb ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    Do Not Disturb
                  </CardTitle>
                  <CardDescription>
                    Manage when you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Do Not Disturb Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily pause all notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.doNotDisturb}
                      onCheckedChange={(checked) => updateSettings('notifications', 'doNotDisturb', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Quiet Hours</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically silence notifications during specific hours
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.quietHours.enabled}
                        onCheckedChange={(checked) => updateSettings('notifications', 'quietHours', { 
                          ...settings.notifications.quietHours, 
                          enabled: checked 
                        })}
                      />
                    </div>

                    {settings.notifications.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                        <div className="space-y-2">
                          <Label htmlFor="quiet-start">Start Time</Label>
                          <Input
                            id="quiet-start"
                            type="time"
                            value={settings.notifications.quietHours.start}
                            onChange={(e) => updateSettings('notifications', 'quietHours', {
                              ...settings.notifications.quietHours,
                              start: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quiet-end">End Time</Label>
                          <Input
                            id="quiet-end"
                            type="time"
                            value={settings.notifications.quietHours.end}
                            onChange={(e) => updateSettings('notifications', 'quietHours', {
                              ...settings.notifications.quietHours,
                              end: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6 mt-0">
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Appearance & Display</CardTitle>
                  <CardDescription>
                    Customize how the application looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label>Theme</Label>
                      <div className="flex gap-3">
                        <Button
                          variant={settings.appearance.theme === 'light' ? 'default' : 'outline'}
                          onClick={() => updateSettings('appearance', 'theme', 'light')}
                          className="flex items-center gap-2"
                        >
                          <Sun className="h-4 w-4" />
                          Light
                        </Button>
                        <Button
                          variant={settings.appearance.theme === 'dark' ? 'default' : 'outline'}
                          onClick={() => updateSettings('appearance', 'theme', 'dark')}
                          className="flex items-center gap-2"
                        >
                          <Moon className="h-4 w-4" />
                          Dark
                        </Button>
                        <Button
                          variant={settings.appearance.theme === 'system' ? 'default' : 'outline'}
                          onClick={() => updateSettings('appearance', 'theme', 'system')}
                          className="flex items-center gap-2"
                        >
                          <Monitor className="h-4 w-4" />
                          System
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Use smaller spacing and condensed layouts
                        </p>
                      </div>
                      <Switch
                        checked={settings.appearance.compactMode}
                        onCheckedChange={(checked) => updateSettings('appearance', 'compactMode', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable smooth transitions and effects
                        </p>
                      </div>
                      <Switch
                        checked={settings.appearance.animations}
                        onCheckedChange={(checked) => updateSettings('appearance', 'animations', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6 mt-0">
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide preferences and data management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <select
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                        value={settings.system.language}
                        onChange={(e) => updateSettings('system', 'language', e.target.value)}
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="es-ES">Español</option>
                        <option value="fr-FR">Français</option>
                        <option value="de-DE">Deutsch</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <select
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                        value={settings.system.timezone}
                        onChange={(e) => updateSettings('system', 'timezone', e.target.value)}
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                      </select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Data Management</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={exportData} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Data
                      </Button>
                      <Button onClick={resetSettings} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-700 dark:text-red-400">
                            Danger Zone
                          </h4>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1 mb-3">
                            These actions cannot be undone. Please proceed with caution.
                          </p>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}