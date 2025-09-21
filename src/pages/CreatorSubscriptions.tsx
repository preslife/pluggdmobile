import { useState } from 'react';

import { CreatorSubscriptionsEditor } from '@/components/CreatorSubscriptionsEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { HeartHandshake, DollarSign, Users, Settings, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreatorSubscriptions() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Please sign in to access monetization settings</h1>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Creator Monetization</h1>
                <p className="text-muted-foreground">
                  Manage your subscription tiers and monetize your content
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Active Subscribers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">£0</div>
                      <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">0%</div>
                      <div className="text-xs text-muted-foreground">Growth Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Total Tiers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="tiers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="tiers" className="mt-6">
              <CreatorSubscriptionsEditor />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Subscription Analytics
                  </CardTitle>
                  <CardDescription>
                    Track your subscription performance and revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
                    <p>Detailed subscription analytics will be available once you have active subscribers.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Monetization Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your creator monetization preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Auto-approve subscriptions</h4>
                        <p className="text-sm text-muted-foreground">
                          Automatically approve new subscriber requests
                        </p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Welcome message</h4>
                        <p className="text-sm text-muted-foreground">
                          Send a welcome message to new subscribers
                        </p>
                      </div>
                      <Badge variant="outline">Disabled</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Subscription notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          Get notified of new subscriptions and cancellations
                        </p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payout Information</CardTitle>
                    <CardDescription>
                      Manage how you receive payments from subscriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Connect Stripe Account</h3>
                      <p className="mb-4">Set up your Stripe account to receive subscription payments.</p>
                      <Button>Connect Stripe</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}