import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Settings } from "lucide-react";
import { NotificationSettings } from "../components/NotificationSettings";
import { usePageMetadata } from "@/hooks/usePageMetadata";

export const SettingsNotificationsPage = () => {
  usePageMetadata({
    title: "Notification Settings — Pluggd",
    description: "Choose how Pluggd keeps you informed about new releases, supporters, and account updates.",
    path: "/settings/notifications",
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Notification Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage how and when you receive notifications.
            </p>
          </div>
          
          <NotificationSettings />
          
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-weekly">Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">Get a weekly summary of your activity</p>
                </div>
                <Switch id="email-weekly" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-marketing">Marketing Updates</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                </div>
                <Switch id="email-marketing" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};