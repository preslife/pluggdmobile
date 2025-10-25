import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { UnifiedInbox } from "@/components/UnifiedInbox";
import useTranslation from "@/hooks/useTranslation";

const InboxPage = () => {
  const { t } = useTranslation();
  useEffect(() => {
    setMeta(
      t("messagingPage.metaTitle"),
      t("messagingPage.metaDescription"),
      "/inbox"
    );
  }, [t]);

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