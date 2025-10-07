import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LibraryItem } from "@/services/library";
import { Download, AlertCircle } from "lucide-react";

interface DownloadTrackerProps {
  items: LibraryItem[];
  loading?: boolean;
  onDownload: (item: LibraryItem) => Promise<void>;
  onRequestMore?: (item: LibraryItem) => void;
}

const typeLabelMap: Record<LibraryItem["type"], string> = {
  beat: "Beat",
  release: "Release",
  sample_pack: "Sample Pack",
  membership: "Membership",
  course: "Course",
};

export const DownloadTracker = ({ items, loading, onDownload, onRequestMore }: DownloadTrackerProps) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (item: LibraryItem) => {
    if (!item.canDownload || !item.downloadSourcePath) {
      onRequestMore?.(item);
      return;
    }

    try {
      setDownloadingId(item.id);
      await onDownload(item);
    } finally {
      setDownloadingId((current) => (current === item.id ? null : current));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          My Downloads
        </CardTitle>
      </CardHeader>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No purchases found.</p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => {
          const typeLabel = typeLabelMap[item.type] ?? item.type;
          const limitText = item.maxDownloads ? `${item.downloadCount} / ${item.maxDownloads}` : `${item.downloadCount}`;
          const limitReached = item.maxDownloads != null && item.downloadCount >= item.maxDownloads;

          return (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge variant="outline">{typeLabel}</Badge>
                      {item.creatorName && (
                        <Badge variant="secondary" className="text-xs">
                          {item.creatorName}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>Downloads: {limitText}</span>
                      {limitReached && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Limit reached
                        </div>
                      )}
                      {item.downloadExpiresAt && (
                        <span>
                          Expires {new Date(item.downloadExpiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(item)}
                      disabled={(item.canDownload && !item.downloadSourcePath) || downloadingId === item.id}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingId === item.id
                        ? "Preparing…"
                        : item.canDownload
                        ? "Download"
                        : "Request support"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
