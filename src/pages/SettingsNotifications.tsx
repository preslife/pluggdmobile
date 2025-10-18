import { useEffect } from "react";
import { Settings } from "lucide-react";
import { NotificationSettings } from "../components/NotificationSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";

export const SettingsNotificationsPage = () => {
  useEffect(() => {
    document.title = "Notifications — Pluggd";
  }, []);

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
          
          <NotificationPreferences />

          <NotificationSettings />
        </div>
      </main>
    </div>
  );
};

