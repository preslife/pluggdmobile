import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, data } = await req.json();

    console.log('Processing offline sync action:', action, 'for user:', userId);

    switch (action) {
      case 'sync_offline_content':
        return await syncOfflineContent(userId, data);
      
      case 'prepare_offline_download':
        return await prepareOfflineDownload(userId, data);
      
      case 'sync_user_data':
        return await syncUserData(userId, data);
      
      case 'handle_offline_actions':
        return await handleOfflineActions(userId, data);
      
      default:
        throw new Error(`Unsupported sync action: ${action}`);
    }

  } catch (error) {
    console.error('Offline sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline sync failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncOfflineContent(userId: string, data: any) {
  const { contentType, lastSyncTimestamp, deviceId } = data;
  
  console.log(`Syncing ${contentType} content for user ${userId} since ${lastSyncTimestamp}`);
  
  // Mock content changes since last sync
  const mockUpdates = {
    releases: [
      {
        id: 'release1',
        title: 'New Track',
        artist: 'Demo Artist',
        action: 'created',
        timestamp: new Date().toISOString(),
        offline_available: true,
        download_url: 'https://example.com/track1.mp3',
        cover_art_url: 'https://example.com/cover1.jpg'
      }
    ],
    playlists: [
      {
        id: 'playlist1',
        name: 'Updated Playlist',
        action: 'updated',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        tracks: ['release1', 'release2']
      }
    ],
    favorites: [
      {
        id: 'fav1',
        release_id: 'release1',
        action: 'created',
        timestamp: new Date(Date.now() - 30000).toISOString()
      }
    ]
  };

  // Simulate sync processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = {
    success: true,
    userId,
    deviceId,
    contentType,
    lastSyncTimestamp: new Date().toISOString(),
    updates: mockUpdates[contentType as keyof typeof mockUpdates] || [],
    syncStats: {
      totalItems: 3,
      newItems: 2,
      updatedItems: 1,
      deletedItems: 0,
      conflictItems: 0
    },
    nextSyncRecommended: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function prepareOfflineDownload(userId: string, data: any) {
  const { releaseIds, quality = 'standard' } = data;
  
  console.log(`Preparing offline download for ${releaseIds.length} releases at ${quality} quality`);
  
  // Mock download preparation
  const downloadPackage = {
    packageId: `package_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    releases: releaseIds.map((id: string) => ({
      releaseId: id,
      audioUrl: `https://offline.example.com/${id}_${quality}.mp3`,
      coverUrl: `https://offline.example.com/${id}_cover.jpg`,
      size: Math.floor(Math.random() * 10) + 3, // 3-13 MB
      duration: Math.floor(Math.random() * 300) + 120 // 2-7 minutes
    })),
    totalSize: releaseIds.length * (Math.floor(Math.random() * 10) + 3),
    quality,
    downloadUrl: `https://offline.example.com/packages/package_${userId}_${Date.now()}.zip`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    preparationTime: Math.floor(Math.random() * 30) + 10 // 10-40 seconds
  };

  // Simulate preparation time
  await new Promise(resolve => setTimeout(resolve, 2000));

  return new Response(JSON.stringify({
    success: true,
    action: 'prepare_offline_download',
    downloadPackage,
    status: 'ready',
    message: 'Offline download package prepared successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncUserData(userId: string, data: any) {
  const { localData, conflictResolution = 'server_wins' } = data;
  
  console.log(`Syncing user data for ${userId} with conflict resolution: ${conflictResolution}`);
  
  // Mock user data sync
  const conflicts = [];
  const merged = [];
  
  // Simulate conflict detection and resolution
  for (const [key, value] of Object.entries(localData)) {
    const hasConflict = Math.random() > 0.8; // 20% chance of conflict
    
    if (hasConflict) {
      conflicts.push({
        field: key,
        localValue: value,
        serverValue: `server_${value}`,
        resolution: conflictResolution,
        resolvedValue: conflictResolution === 'server_wins' ? `server_${value}` : value
      });
    }
    
    merged.push({
      field: key,
      value: hasConflict && conflictResolution === 'server_wins' ? `server_${value}` : value,
      lastModified: new Date().toISOString()
    });
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  return new Response(JSON.stringify({
    success: true,
    action: 'sync_user_data',
    userId,
    syncResult: {
      totalFields: Object.keys(localData).length,
      conflicts: conflicts.length,
      merged: merged.length,
      conflictDetails: conflicts
    },
    mergedData: merged,
    lastSyncTimestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleOfflineActions(userId: string, data: any) {
  const { queuedActions } = data;
  
  console.log(`Processing ${queuedActions.length} queued offline actions for user ${userId}`);
  
  const results = [];
  
  for (const action of queuedActions) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate action processing
    const success = Math.random() > 0.05; // 95% success rate
    
    results.push({
      actionId: action.id,
      type: action.type,
      success,
      error: success ? null : 'Server validation failed',
      processedAt: new Date().toISOString(),
      originalTimestamp: action.timestamp
    });
  }

  const summary = {
    totalActions: queuedActions.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    processingTime: queuedActions.length * 100 // milliseconds
  };

  return new Response(JSON.stringify({
    success: true,
    action: 'handle_offline_actions',
    userId,
    results,
    summary,
    syncComplete: summary.failed === 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}