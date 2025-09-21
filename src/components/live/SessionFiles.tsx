import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessionFiles } from "@/hooks/useSessionFiles";
import { useSessionMembership } from "@/hooks/useSessionMembership";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  sessionId: string | undefined;
  session: any;
};

const SessionFiles = ({ sessionId, session }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { files, loading: filesLoading, uploading, upload, remove: removeFile, getSignedUrl } = useSessionFiles(sessionId);
  const { canWrite } = useSessionMembership(sessionId);

  const formatSize = (n?: number | null) => {
    if (!n) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = n as number;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    const digits = size < 10 && i > 0 ? 1 : 0;
    return `${size.toFixed(digits)} ${units[i]}`;
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || !sessionId) return;
    for (const file of Array.from(list)) {
      const isAudio = file.type.startsWith('audio/') || /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(file.name);
      if (isAudio && file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 50MB limit`, variant: "destructive" });
        continue;
      }
      const { error } = await upload(file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      }
    }
    toast({ title: "Upload complete", description: "Files uploaded to the session." });
    e.target.value = "";
  };

  const onDownload = useCallback(async (file_url: string) => {
    const { url, error } = await getSignedUrl(file_url);
    if (error || !url) {
      return toast({ title: "Download failed", description: error?.message || "Unable to get link", variant: "destructive" });
    }
    window.open(url, "_blank");
  }, [getSignedUrl, toast]);

  const onDeleteFile = useCallback(async (idToDelete: string, fileUrl: string) => {
    const { error } = await removeFile(idToDelete, fileUrl);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "File removed" });
  }, [removeFile, toast]);

  if (!user) {
    return <p className="text-sm text-muted-foreground">Please sign in to upload and view files.</p>;
  }

  return (
    <div>
      {!canWrite && (
        <p className="mb-2 text-xs text-muted-foreground">Join the session to upload files.</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="file"
          multiple
          accept=".wav,.mp3,.mid,.midi,.zip"
          onChange={onFileChange}
          className="text-sm"
          disabled={!canWrite || uploading}
        />
        <span className="text-xs text-muted-foreground">{uploading ? 'Uploading…' : 'WAV/MP3/MIDI/ZIP'}</span>
      </div>
      <div className="mt-4 space-y-2">
        {filesLoading ? (
          <p className="text-sm text-muted-foreground">Loading files…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          files.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleString()}
                  {f.file_type ? ` • ${String(f.file_type).split('/').pop()}` : ''}
                  {typeof f.size === 'number' ? ` • ${formatSize(f.size)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onDownload(f.file_url)}>Download</Button>
                {(user?.id === f.user_id || user?.id === session?.host_id) && (
                  <Button size="sm" variant="destructive" onClick={() => onDeleteFile(f.id, f.file_url)} disabled={!canWrite}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionFiles;
