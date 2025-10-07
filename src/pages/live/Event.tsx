
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import LiveCTA from "@/components/LiveCTA";
import { supabase } from "@/integrations/supabase/client";
import { useGamification, Contest, ContestSubmission } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import { useContestRealtime } from "@/hooks/useContestRealtime";
import { Trophy } from "lucide-react";
import { getContestStatus, getTimeRemaining } from "@/utils/contests";


const LiveEvent = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { submitToContest, voteForSubmission } = useGamification();

  const [contest, setContest] = useState<Contest | null>(null);
  const [loadingContest, setLoadingContest] = useState(true);
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [userBeats, setUserBeats] = useState<any[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [votingSubmissionId, setVotingSubmissionId] = useState<string | null>(null);

  const hasSubmitted = useMemo(() => {
    if (!user) return false;
    return submissions.some((s) => s.user_id === user.id);
  }, [submissions, user]);

  const contestStatus = useMemo(() => {
    return contest ? getContestStatus(contest) : "upcoming";
  }, [contest]);

  useEffect(() => {
    const fetchContest = async () => {
      if (!id) return;
      setLoadingContest(true);
      const { data } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setContest(data as Contest);
        setMeta(
          `${data.title} — Beat Battle`,
          data.description || "Watch replays, see results, and join the community.",
          `/live/event/${id}`
        );
      }
      setLoadingContest(false);
    };
    fetchContest();
  }, [id]);

  const fetchContestSubmissions = async (contestId: string) => {
    setLoadingSubmissions(true);
    const { data } = await supabase
      .from("contest_submissions")
      .select(`*, beats(title, audio_url, image_url), profiles(username, full_name)`) // @ts-expect-error Supabase nested select typing
      .eq("contest_id", contestId)
      .order("votes_count", { ascending: false });
    setSubmissions((data as any[]) || []);
    setLoadingSubmissions(false);
  };

  const fetchUserBeats = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("beats")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_published", true);
    setUserBeats(data || []);
  };

  const fetchUserVote = async () => {
    if (!user || !contest?.id) return;
    const { data } = await supabase
      .from("contest_votes")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("voter_id", user.id)
      .maybeSingle();
    setHasVoted(!!data);
  };

  useEffect(() => {
    if (contest?.id) fetchContestSubmissions(contest.id);
  }, [contest?.id]);

  useEffect(() => {
    fetchUserBeats();
  }, [user?.id]);

  useEffect(() => {
    fetchUserVote();
  }, [user?.id, contest?.id]);

  // Realtime updates: submissions and votes
  useContestRealtime(contest?.id, {
    onSubmissionInsert: () => {
      if (contest?.id) fetchContestSubmissions(contest.id);
    },
    onSubmissionUpdate: () => {
      if (contest?.id) fetchContestSubmissions(contest.id);
    },
    onVoteInsert: (row) => {
      // Optimistically bump the vote count for the submission
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === row.submission_id
            ? { ...s, votes_count: (s.votes_count || 0) + 1 }
            : s
        )
      );
      // If this user just voted, mark as voted
      if (user && row.voter_id === user.id) {
        setHasVoted(true);
      }
    },
  });

  const handleVote = async (submissionId: string) => {
    if (!contest) return;
    setVotingSubmissionId(submissionId);
    const { error } = await voteForSubmission(contest.id, submissionId);
    if (!error) {
      setHasVoted(true);
      // Optimistic local increment; realtime will also sync
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, votes_count: (s.votes_count || 0) + 1 } : s
        )
      );
    }
    setVotingSubmissionId(null);
  };

  const isWinner = (s: ContestSubmission, idx: number) => {
    if (!contest) return false;
    const status = getContestStatus(contest);
    if (status !== "completed") return false;
    // Prefer explicit rank, fallback to first in list
    return s.rank === 1 || idx === 0;
  };

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {loadingContest && (
          <p className="text-muted-foreground">Loading event…</p>
        )}

        {!loadingContest && !contest && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold">Event not found</h1>
            <div className="mt-6 flex gap-2">
              <Link to="/live/battles"><Button variant="outline">Back to Battles</Button></Link>
            </div>
          </>
        )}

        {contest && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold">{contest.title}</h1>
            <p className="mt-2 text-muted-foreground">{contest.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{contestStatus}</Badge>
              <span>•</span>
              <span>{getTimeRemaining(contest)}</span>
              {contest.genre && <Badge variant="secondary">{contest.genre}</Badge>}
            </div>

            <div className="mt-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="submit">Submit</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {contest.theme && (
                    <div>
                      <h2 className="font-semibold mb-2">Theme</h2>
                      <Badge variant="outline">{contest.theme}</Badge>
                    </div>
                  )}
                  {contest.rules && (
                    <div>
                      <h2 className="font-semibold mb-2">Rules</h2>
                      <p className="text-muted-foreground whitespace-pre-wrap">{contest.rules}</p>
                    </div>
                  )}
                  {contest.prize_description && (
                    <div>
                      <h2 className="font-semibold mb-2">Prize</h2>
                      <p className="text-muted-foreground">{contest.prize_description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-1">Start</h3>
                      <p className="text-muted-foreground">{new Date(contest.start_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">End</h3>
                      <p className="text-muted-foreground">{new Date(contest.end_date).toLocaleString()}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="submit" className="space-y-4">
                  {!user && (
                    <p className="text-muted-foreground">Sign in to submit your beat.</p>
                  )}
                  {user && userBeats.length === 0 && (
                    <p className="text-muted-foreground">
                      You have no published beats yet. Upload a beat first. Max 50 MB.
                    </p>
                  )}
                  {user && userBeats.length > 0 && (
                    <div className="grid gap-3">
                      {userBeats.map((beat) => (
                        <div key={beat.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {beat.image_url && (
                              <img src={beat.image_url} alt={beat.title} className="w-12 h-12 rounded object-cover" />
                            )}
                            <div>
                              <h4 className="font-medium">{beat.title}</h4>
                              <p className="text-sm text-muted-foreground">{beat.genre} • {beat.bpm} BPM</p>
                            </div>
                          </div>
                          <Button onClick={() => submitToContest(contest.id, beat.id)} size="sm" disabled={hasSubmitted || contestStatus !== 'active'}>
                            {hasSubmitted ? "Already Submitted" : contestStatus !== 'active' ? 'Opens when active' : "Submit"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="submissions" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Contest Submissions</h2>
                    <Badge variant="outline">{submissions.length}</Badge>
                  </div>

                  {loadingSubmissions && <p className="text-muted-foreground">Loading submissions…</p>}
                  {!loadingSubmissions && submissions.length === 0 && (
                    <p className="text-muted-foreground">No submissions yet.</p>
                  )}
                  {!loadingSubmissions && submissions.length > 0 && (
                    <div className="space-y-3">
                      {submissions.map((s, idx) => {
                        const canVote =
                          !!user &&
                          contestStatus === "voting" &&
                          !hasSubmitted &&
                          !hasVoted &&
                          user.id !== s.user_id;

                        return (
                          <div key={s.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">#{idx + 1}</Badge>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{s.beats?.title || "Untitled"}</h4>
                                    {isWinner(s, idx) && (
                                      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">
                                        <Trophy size={16} aria-hidden="true" />
                                        Winner
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">by {s.profiles?.username || "Anonymous"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{s.votes_count} votes</Badge>
                                {canVote && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVote(s.id)}
                                    disabled={votingSubmissionId === s.id}
                                    aria-label={`Vote for ${s.beats?.title || "submission"}`}
                                  >
                                    {votingSubmissionId === s.id ? "Voting..." : "Vote"}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {s.beats?.audio_url && (
                              <div className="p-3 bg-muted/50 border rounded-lg">
                                <audio controls src={s.beats.audio_url} className="w-full" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="mt-6 flex gap-2">
              <Link to="/auth"><Button>Join the Community</Button></Link>
              <Link to="/live/battles"><Button variant="outline">Back to Battles</Button></Link>
            </div>
          </>
        )}
      </div>
      <LiveCTA />
    </main>
  );
};

export default LiveEvent;
