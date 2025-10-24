import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { UnifiedInbox } from "@/components/UnifiedInbox";
import { useIntl } from "react-intl";

const InboxPage = () => {
  const intl = useIntl();
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {intl.formatMessage({ id: "pages.messaging.title", defaultMessage: "Unified Inbox" })}
            </h1>
            <p className="text-muted-foreground">
              {intl.formatMessage({
                id: "pages.messaging.subtitle",
                defaultMessage: "Manage all your messages from YouTube, Discord, Gmail, and more in one place.",
              })}
            </p>
          </div>
          <UnifiedInbox />
        </div>
      </main>
    </div>
  );
};

export default InboxPage;