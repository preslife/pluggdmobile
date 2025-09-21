import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radio,
  FileText,
  HeadphonesIcon,
  Plus,
  Calendar,
  Users,
  DollarSign,
  Play,
  Settings,
  Clock,
} from "lucide-react";

export const LiveModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Streaming</h1>
          <p className="text-muted-foreground">
            Manage your live sessions, ticket sales, and recordings.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <HeadphonesIcon className="h-4 w-4" />
            Recordings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Manage your scheduled live performances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Sessions Scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first live session to connect with your audience
                </p>
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Management</CardTitle>
              <CardDescription>Sell tickets for your live events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tickets Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create tickets for your live events and shows
                </p>
                <Button>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Create Tickets
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings">
          <Card>
            <CardHeader>
              <CardTitle>Session Recordings</CardTitle>
              <CardDescription>Access recordings from your past live sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <HeadphonesIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recordings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Your live session recordings will appear here
                </p>
                <Button disabled>
                  <Play className="w-4 h-4 mr-2" />
                  View Recordings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};