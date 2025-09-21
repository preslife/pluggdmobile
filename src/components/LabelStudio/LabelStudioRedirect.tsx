import React, { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";

type MinimalLabel = {
  id: string;
  slug: string;
  name: string | null;
  role: string | null;
};

export default function LabelStudioRedirect() {
  const [searchParams] = useSearchParams();
  const createRequested = searchParams.get("create") === "1";
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<MinimalLabel[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorText(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        if (!isMounted) return;
        setLabels([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_current_user_labels");
      if (!isMounted) return;

      if (error) {
        setLabels([]);
        setErrorText(error.message);
      } else {
        const parsed = Array.isArray(data) ? data : [];
        setLabels(
          parsed.map((item: any) => ({
            id: item.id,
            slug: item.slug,
            name: item.name ?? null,
            role: item.role ?? item.your_role ?? null,
          }))
        );
      }

      setLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold mb-2">Label Studio</h1>
          <p className="text-muted-foreground">Checking your label access…</p>
        </div>
      </div>
    );
  }

  if (!createRequested && labels.length > 0) {
    const firstSlug = labels[0]?.slug;
    if (firstSlug) {
      return <Navigate to={`/studio/label/${firstSlug}/roster`} replace />;
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Label Studio</h1>
          <p className="text-muted-foreground">
            {createRequested && labels.length > 0
              ? "Create another label for your workspace."
              : "Create or upgrade to a label to get started."}
          </p>
          {errorText ? <p className="text-sm text-red-500 mt-2">Error: {errorText}</p> : null}
        </div>
        <CreateLabelForm
          onCreated={() => {
            window.location.replace("/studio/label");
          }}
        />
      </div>
    </div>
  );
}
