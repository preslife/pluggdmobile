import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { UnifiedInbox } from "@/components/UnifiedInbox";

const InboxPage = () => {
  useEffect(() => {
    setMeta(
      "Unified Inbox — Pluggd",
      "Manage all your messages from YouTube, Discord, Gmail, and more in one place.",
      "/inbox"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <UnifiedInbox />
        </div>
      </main>
    </div>
  );
};

export default InboxPage;