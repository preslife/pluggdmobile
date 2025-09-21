import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ReferralPage = () => {
  const { user } = useAuth();

  useEffect(() => {
    setMeta(
      "Referral Program — Pluggd",
      "Invite friends to Pluggd and earn rewards together. Get credits for every friend who joins!",
      "/referrals"
    );
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please sign in to access the referral program.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <ReferralDashboard />
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;