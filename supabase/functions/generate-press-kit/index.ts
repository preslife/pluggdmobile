import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_type, entity_id } = await req.json();
    
    // Create Supabase client with service role for secure operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    let pressKitData: any = {};
    let fileName = '';
    let updateTable = '';
    let updateId = entity_id;

    if (entity_type === 'creator') {
      // Fetch creator/profile data
      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .select(`
          *,
          releases(id, title, cover_art_url, created_at),
          social_connections(provider, provider_user_id, connection_data)
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      pressKitData = {
        type: 'creator',
        name: profile.full_name || profile.username || 'Artist',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url,
        releases: profile.releases?.slice(0, 5) || [], // Top 5 releases
        social_links: profile.social_connections || [],
        generated_at: new Date().toISOString(),
        stats: {
          total_releases: profile.releases?.length || 0,
          member_since: profile.created_at
        }
      };

      fileName = `creator-${profile.username || user.id}-presskit-${Date.now()}.json`;
      updateTable = 'profiles';
      updateId = profile.id;

    } else if (entity_type === 'release') {
      // Fetch release data
      const { data: release, error: releaseError } = await supabaseService
        .from('releases')
        .select(`
          *,
          profiles!user_id(full_name, username, avatar_url, bio),
          release_comments(content, created_at, profiles(full_name))
        `)
        .eq('id', entity_id)
        .eq('user_id', user.id)
        .single();

      if (releaseError || !release) {
        throw new Error('Release not found or unauthorized');
      }

      pressKitData = {
        type: 'release',
        title: release.title,
        artist: release.artist,
        cover_art_url: release.cover_art_url,
        description: release.description,
        genre: release.genre,
        release_date: release.release_date,
        smartlink_slug: release.smartlink_slug,
        dsp_links: release.dsp_links || {},
        credits_json: release.credits_json || {},
        artist_info: release.profiles,
        comments: release.release_comments?.slice(0, 3) || [], // Featured comments
        generated_at: new Date().toISOString()
      };

      fileName = `release-${release.smartlink_slug || entity_id}-presskit-${Date.now()}.json`;
      updateTable = 'releases';

    } else {
      throw new Error('Invalid entity type');
    }

    // Generate HTML content for the press kit
    const htmlContent = generatePressKitHTML(pressKitData);

    // Upload HTML file to storage
    const { data: uploadData, error: uploadError } = await supabaseService.storage
      .from('certificates') // Reuse existing bucket
      .upload(`presskits/${fileName.replace('.json', '.html')}`, 
        new Blob([htmlContent], { type: 'text/html' }));

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL
    const { data: urlData } = await supabaseService.storage
      .from('certificates')
      .createSignedUrl(uploadData.path, 3600 * 24 * 7); // 7 days

    const pressKitUrl = urlData?.signedUrl;

    // Update the entity with the press kit URL
    await supabaseService
      .from(updateTable)
      .update({ presskit_url: pressKitUrl })
      .eq('id', updateId);

    // Log the generation event
    await supabaseService
      .from('download_events')
      .insert({
        user_id: user.id,
        purchase_id: entity_id,
        purchase_type: `press_kit_${entity_type}`,
        file_path: uploadData.path
      });

    return new Response(JSON.stringify({
      success: true,
      press_kit_url: pressKitUrl,
      message: 'Press kit generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Press kit generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate press kit' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function generatePressKitHTML(data: any): string {
  const isCreator = data.type === 'creator';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isCreator ? `${data.name} - Press Kit` : `${data.title} - Press Kit`}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .avatar { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 0 auto 20px; display: block; }
        .cover-art { width: 300px; height: 300px; object-fit: cover; margin: 0 auto 20px; display: block; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #444; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .links { display: flex; flex-wrap: wrap; gap: 10px; }
        .link-button { background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; }
        .credit-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        @media print { body { max-width: none; margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        ${isCreator ? 
          `<img src="${data.avatar_url || ''}" alt="${data.name}" class="avatar" onerror="this.style.display='none'">
           <h1>${data.name}</h1>
           <p style="font-size: 18px; color: #666;">Artist Press Kit</p>` :
          `<img src="${data.cover_art_url || ''}" alt="${data.title}" class="cover-art" onerror="this.style.display='none'">
           <h1>${data.title}</h1>
           <p style="font-size: 18px; color: #666;">by ${data.artist}</p>`
        }
    </div>

    ${isCreator ? `
    <div class="section">
        <h2>Biography</h2>
        <p>${data.bio || 'Artist biography not available.'}</p>
    </div>

    <div class="section">
        <h2>Stats</h2>
        <div class="stats">
            <div class="stat-box">
                <h3>${data.stats.total_releases}</h3>
                <p>Total Releases</p>
            </div>
            <div class="stat-box">
                <h3>${new Date(data.stats.member_since).getFullYear()}</h3>
                <p>Member Since</p>
            </div>
        </div>
    </div>

    ${data.releases.length > 0 ? `
    <div class="section">
        <h2>Recent Releases</h2>
        ${data.releases.map((release: any) => `
            <div class="credit-item">
                <strong>${release.title}</strong> - ${new Date(release.created_at).getFullYear()}
            </div>
        `).join('')}
    </div>` : ''}
    ` : `
    <div class="section">
        <h2>Release Information</h2>
        <p><strong>Genre:</strong> ${data.genre || 'Not specified'}</p>
        <p><strong>Release Date:</strong> ${data.release_date ? new Date(data.release_date).toLocaleDateString() : 'Not specified'}</p>
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
    </div>

    ${data.credits_json && Object.keys(data.credits_json).length > 0 ? `
    <div class="section">
        <h2>Credits</h2>
        ${Object.entries(data.credits_json).map(([role, name]) => `
            <div class="credit-item">
                <strong>${role}:</strong> ${name}
            </div>
        `).join('')}
    </div>` : ''}

    ${data.dsp_links && Object.keys(data.dsp_links).length > 0 ? `
    <div class="section">
        <h2>Streaming Links</h2>
        <div class="links">
            ${Object.entries(data.dsp_links).map(([platform, url]) => `
                <a href="${url}" class="link-button" target="_blank">${platform}</a>
            `).join('')}
        </div>
    </div>` : ''}
    `}

    <div class="footer">
        <p>Press Kit generated on ${new Date(data.generated_at).toLocaleDateString()}</p>
        <p>Powered by Pluggd - Professional Music Platform</p>
    </div>
</body>
</html>`;
}