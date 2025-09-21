import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  HardDrive,
  Music
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type OfflineContent = {
  id: string;
  title: string;
  artist: string;
  type: 'release' | 'playlist' | 'album';
  size: number;
  downloadedAt: string;
  lastPlayed?: string;
  cover_art_url?: string;
};

type SyncStatus = {
  isOnline: boolean;
  lastSync: string;
  pendingActions: number;
  syncInProgress: boolean;
  offlineStorage: {
    used: number;
    available: number;
    total: number;
  };
};

const OfflineManager = () => {
  const { toast } = useToast();
  const [offlineContent, setOfflineContent] = useState<OfflineContent[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pendingActions: 3,
    syncInProgress: false,
    offlineStorage: {
      used: 1.2 * 1024 * 1024 * 1024, // 1.2 GB
      available: 3.8 * 1024 * 1024 * 1024, // 3.8 GB
      total: 5 * 1024 * 1024 * 1024 // 5 GB
    }
  });
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Mock offline content
    const mockContent: OfflineContent[] = [
      {
        id: '1',
        title: 'Lo-Fi Beats Collection',
        artist: 'Chill Producer',
        type: 'playlist',
        size: 250 * 1024 * 1024, // 250 MB
        downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastPlayed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        title: 'Midnight Sessions',
        artist: 'Various Artists',
        type: 'album',
        size: 180 * 1024 * 1024, // 180 MB
        downloadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastPlayed: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'Urban Flow',
        artist: 'Street Beats',
        type: 'release',
        size: 12 * 1024 * 1024, // 12 MB
        downloadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    setOfflineContent(mockContent);

    // Listen for online/offline events
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const startSync = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        lastSync: new Date().toISOString(),
        pendingActions: 0
      }));
      
      toast({
        title: "Sync Complete",
        description: "All offline content has been synchronized."
      });
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
      toast({
        title: "Sync Failed",
        description: "Unable to sync offline content. Try again later.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const downloadForOffline = useCallback(async (contentId: string) => {
    setDownloadProgress(prev => ({ ...prev, [contentId]: 0 }));
    
    // Simulate download progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setDownloadProgress(prev => ({ ...prev, [contentId]: progress }));
    }
    
    // Add to offline content
    const newContent: OfflineContent = {
      id: contentId,
      title: 'New Download',
      artist: 'Demo Artist',
      type: 'release',
      size: 15 * 1024 * 1024,
      downloadedAt: new Date().toISOString()
    };
    
    setOfflineContent(prev => [...prev, newContent]);
    setDownloadProgress(prev => ({ ...prev, [contentId]: undefined as any }));
    
    toast({
      title: "Download Complete",
      description: "Content is now available offline."
    });
  }, [toast]);

  const removeOfflineContent = useCallback((contentId: string) => {
    setOfflineContent(prev => prev.filter(content => content.id !== contentId));
    toast({
      title: "Content Removed",
      description: "Offline content has been deleted to free up space."
    });
  }, [toast]);

  const clearAllOfflineContent = useCallback(() => {
    setOfflineContent([]);
    toast({
      title: "All Content Cleared",
      description: "All offline content has been removed."
    });
  }, [toast]);

  const storageUsedPercentage = (syncStatus.offlineStorage.used / syncStatus.offlineStorage.total) * 100;

  return (
    <div className="space-y-6">
      {/* Connection & Sync Status */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {syncStatus.isOnline ? (
                <Wifi className="w-6 h-6 text-green-500" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-500" />
              )}
              <div>
                <h3 className="font-medium">
                  {syncStatus.isOnline ? 'Online' : 'Offline Mode'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Last sync: {formatDate(syncStatus.lastSync)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {syncStatus.pendingActions > 0 && (
                <Badge variant="secondary">
                  {syncStatus.pendingActions} pending
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={startSync}
                disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              >
                <RotateCcw className={`w-4 h-4 mr-2 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
                {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Storage Usage
              </span>
              <span>{formatFileSize(syncStatus.offlineStorage.used)} / {formatFileSize(syncStatus.offlineStorage.total)}</span>
            </div>
            <Progress value={storageUsedPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{storageUsedPercentage.toFixed(1)}% used</span>
              <span>{formatFileSize(syncStatus.offlineStorage.available)} available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Content */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Offline Content</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadForOffline('demo')}>
                <Download className="w-4 h-4 mr-2" />
                Download More
              </Button>
              {offlineContent.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllOfflineContent}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {offlineContent.map((content) => (
              <div key={content.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {content.cover_art_url ? (
                    <img 
                      src={content.cover_art_url} 
                      alt={content.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{content.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{content.artist}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {content.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(content.size)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Downloaded {formatDate(content.downloadedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {content.lastPlayed && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(content.lastPlayed)}
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOfflineContent(content.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            {/* Download Progress */}
            {Object.entries(downloadProgress).map(([contentId, progress]) => (
              progress !== undefined && (
                <div key={contentId} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <Download className="w-6 h-6 text-primary animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Downloading...</p>
                    <Progress value={progress} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
                  </div>
                </div>
              )
            ))}
          </div>

          {offlineContent.length === 0 && (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Offline Content</h3>
              <p className="text-muted-foreground mb-4">
                Download music to enjoy it without an internet connection.
              </p>
              <Button onClick={() => downloadForOffline('sample')}>
                <Download className="w-4 h-4 mr-2" />
                Download Sample Content
              </Button>
            </div>
          )}

          {/* Offline Mode Notice */}
          {!syncStatus.isOnline && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  You're offline. Only downloaded content is available for playback.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status Details */}
      {syncStatus.pendingActions > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Pending Sync Actions</h3>
            <div className="space-y-2">
              {[
                'Like added to "Midnight Vibes"',
                'Playlist "Favorites" updated',
                'Play count for "Urban Flow" updated'
              ].slice(0, syncStatus.pendingActions).map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {action}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              These actions will be synced when you're back online.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OfflineManager;