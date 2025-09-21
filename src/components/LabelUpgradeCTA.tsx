import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Crown, Users, TrendingUp, Star, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalStudioContext } from "@/contexts/StudioContext";

interface LabelUpgradeCTAProps {
  className?: string;
}

export function LabelUpgradeCTA({ className }: LabelUpgradeCTAProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studioContext = useOptionalStudioContext();

  // Don't show if user already has label memberships
  if (studioContext?.memberships && studioContext.memberships.length > 0) {
    return null;
  }

  const benefits = [
    { icon: Users, text: "Manage team members and collaborators" },
    { icon: TrendingUp, text: "Centralized revenue and analytics" },
    { icon: Building, text: "Professional brand presence" },
    { icon: Crown, text: "Priority support and features" }
  ];

  return (
    <Card className={`border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Upgrade to Label Account</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Star className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            </div>
            <CardDescription className="text-base">
              Scale your music business with professional team management,
              advanced analytics, and collaborative tools.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="border rounded-lg p-4 bg-background/50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">What's included:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>• Unlimited team members</div>
            <div>• Role-based permissions</div>
            <div>• Label-branded releases</div>
            <div>• Advanced split management</div>
            <div>• Consolidated reporting</div>
            <div>• Priority distribution</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => navigate("/studio/label")}
          >
            <Building className="h-4 w-4 mr-2" />
            Create Label Account
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/labels/learn-more")}
          >
            Learn More
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">1000+</div>
            <div className="text-xs text-muted-foreground">Active Labels</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">50k+</div>
            <div className="text-xs text-muted-foreground">Releases Managed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">$2M+</div>
            <div className="text-xs text-muted-foreground">Revenue Processed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}