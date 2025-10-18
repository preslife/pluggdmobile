import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Gift, LogIn, ArrowRight } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

type ClaimState = "idle" | "loading" | "success" | "error" | "missing-token";

interface ClaimResponse {
  ok?: boolean;
  release?: {
    id?: string;
    title?: string;
    artist?: string;
    cover_art_url?: string | null;
  };
  libraryUrl?: string;
  error?: string;
  expectedEmail?: string;
}

export const GiftClaim = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const { user } = useAuth();

  const [state, setState] = useState<ClaimState>(token ? "idle" : "missing-token");
  const [error, setError] = useState<string | null>(null);
  const [expectedEmail, setExpectedEmail] = useState<string | null>(null);
  const [release, setRelease] = useState<ClaimResponse["release"] | null>(null);
  const [libraryUrl, setLibraryUrl] = useState<string | null>(null);

  usePageMetadata({
    title: "Claim Your Gift — Pluggd",
    description: "Redeem gifted releases instantly and add them to your Pluggd library.",
    path: "/gift/claim",
  });

  useEffect(() => {
    let canceled = false;

    const claimGift = async () => {
      if (!token) {
        setState("missing-token");
        return;
      }
      if (!user) {
        return;
      }

      setState("loading");
      setError(null);
      setRelease(null);
      setExpectedEmail(null);

      const { data, error: claimError } = await supabase.functions.invoke<ClaimResponse>(
        "claim-release-gift",
        {
          body: { token },
        },
      );

      if (canceled) return;

      if (claimError || !data?.ok) {
        setError(data?.error ?? claimError?.message ?? "Unable to claim this gift right now.");
        if (data?.expectedEmail) {
          setExpectedEmail(data.expectedEmail);
        }
        setState("error");
        return;
      }

      setRelease(data.release ?? null);
      setLibraryUrl(data.libraryUrl ?? null);
      setState("success");
    };

    void claimGift();

    return () => {
      canceled = true;
    };
  }, [token, user]);

  const renderBody = () => {
    if (state === "missing-token") {
      return (
        <Alert variant="destructive">
          <AlertTitle>Missing claim token</AlertTitle>
          <AlertDescription>
            The gift claim link is invalid. Please open the link directly from the email you received.
          </AlertDescription>
        </Alert>
      );
    }

    if (!user) {
      return (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Sign in to claim your gift</h2>
            <p className="text-muted-foreground">
              Use the same email address the gift was sent to so we can unlock it in your library.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/auth" className="inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign in or create an account
            </Link>
          </Button>
        </div>
      );
    }

    if (state === "loading") {
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying your gift…</p>
        </div>
      );
    }

    if (state === "error") {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unable to claim gift</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error ?? "Something went wrong. Please try again or contact support."}</p>
            {expectedEmail && (
              <p>
                This gift was sent to <span className="font-medium">{expectedEmail}</span>. Sign in with that
                email address to claim it.
              </p>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    if (state === "success") {
      return (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Gift claimed!</h2>
            <p className="text-muted-foreground">
              {release?.title ? (
                <>
                  <span className="font-medium">{release.title}</span>
                  {release?.artist ? ` by ${release.artist}` : ""} is now in your library.
                </>
              ) : (
                "Your new release is now in your library."
              )}
            </p>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <Gift className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">{release?.title ?? "Release unlocked"}</p>
                <p className="text-xs text-muted-foreground">
                  {release?.artist ?? "Available in your downloads & streams"}
                </p>
              </div>
            </div>
          </div>
          <Button asChild size="lg">
            <a href={libraryUrl ?? "/library"} className="inline-flex items-center gap-2">
              Go to my library <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16">
        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle>Claim your gift</CardTitle>
            <CardDescription>
              Redeem music that a friend purchased for you and add it to your Pluggd library.
            </CardDescription>
          </CardHeader>
          <CardContent>{renderBody()}</CardContent>
          {user && token && state === "idle" && (
            <CardFooter className="justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GiftClaim;
