import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileManager } from "@/components/ProfileManager";
import { NotificationSettings } from "@/components/NotificationSettings";
import SettingsConnectionsPage from "./SettingsConnections";
import SettingsFavNicknamesPage from "./SettingsFavNicknames";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { usePageMetadata } from "@/hooks/usePageMetadata";

const Settings = () => {
  usePageMetadata({
    title: "Settings — Pluggd",
    description: "Manage your account details, notification preferences, connections, and saved favorites.",
    path: "/settings",
  });

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="pt-24 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account, notifications, and connections.</p>
          </div>

          <Tabs defaultValue="account" className="w-full">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <NotificationSettings />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections">
              <SettingsConnectionsPage />
            </TabsContent>

            <TabsContent value="favorites">
              <SettingsFavNicknamesPage />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
