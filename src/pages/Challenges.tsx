import { AutomatedChallenges } from "@/components/AutomatedChallenges";
import { ChallengeVoting } from "@/components/ChallengeVoting";

import { setMeta } from "@/lib/seo";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Challenges = () => {
  const [activeChallenge, setActiveChallenge] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setMeta(
      "Music Challenges — Pluggd",
      "Join automated music challenges, compete with creators, and earn rewards.",
      "/challenges"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4">
        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="challenges">All Challenges</TabsTrigger>
            <TabsTrigger value="voting" disabled={!activeChallenge}>
              Vote ({activeChallenge?.title || 'Select Challenge'})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="challenges">
            <AutomatedChallenges />
          </TabsContent>
          
          <TabsContent value="voting">
            {activeChallenge ? (
              <ChallengeVoting 
                challengeId={activeChallenge.id}
                challengeTitle={activeChallenge.title}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Select a challenge to view submissions and vote.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Challenges;