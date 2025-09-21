import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parse } from "https://deno.land/std@0.190.0/csv/parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BULK-IMPORT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting bulk import");

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const formData = await req.formData();
    const importType = formData.get("type") as string; // 'beats', 'releases', 'packs'
    const csvFile = formData.get("csv") as File;
    const zipFile = formData.get("zip") as File;
    const dryRun = formData.get("dryRun") === "true";

    if (!csvFile || !importType) {
      throw new Error("CSV file and import type are required");
    }

    logStep("Processing import", { importType, dryRun, hasCsv: !!csvFile, hasZip: !!zipFile });

    // Parse CSV
    const csvText = await csvFile.text();
    const csvData = parse(csvText, { skipFirstRow: true });
    
    logStep("CSV parsed", { rowCount: csvData.length });

    const results = [];
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2; // Account for header row
      
      try {
        if (importType === 'beats') {
          const beatData = {
            title: row[0],
            bpm: parseInt(row[1]) || null,
            key: row[2] || null,
            price: parseFloat(row[3]) * 100 || 0, // Convert to cents
            tags: row[4] ? row[4].split(',').map(t => t.trim()) : [],
            genre: row[5] || 'Hip Hop',
            user_id: user.id,
            is_published: true
          };

          // Validate required fields
          if (!beatData.title) {
            errors.push({ row: rowNum, error: "Title is required" });
            continue;
          }

          if (!dryRun) {
            const { data, error } = await supabaseService
              .from('beats')
              .insert(beatData)
              .select()
              .single();

            if (error) {
              errors.push({ row: rowNum, error: error.message });
            } else {
              results.push({ row: rowNum, id: data.id, type: 'beat', title: beatData.title });
            }
          } else {
            results.push({ row: rowNum, preview: beatData, type: 'beat', valid: true });
          }
        }
        else if (importType === 'releases') {
          const releaseData = {
            title: row[0],
            artist: row[1],
            genre: row[2] || 'Hip Hop',
            release_type: row[3] || 'single',
            release_date: row[4] ? new Date(row[4]).toISOString() : new Date().toISOString(),
            price: parseFloat(row[5]) * 100 || 0,
            user_id: user.id,
            status: 'approved'
          };

          if (!releaseData.title || !releaseData.artist) {
            errors.push({ row: rowNum, error: "Title and artist are required" });
            continue;
          }

          if (!dryRun) {
            const { data, error } = await supabaseService
              .from('releases')
              .insert(releaseData)
              .select()
              .single();

            if (error) {
              errors.push({ row: rowNum, error: error.message });
            } else {
              results.push({ row: rowNum, id: data.id, type: 'release', title: releaseData.title });
            }
          } else {
            results.push({ row: rowNum, preview: releaseData, type: 'release', valid: true });
          }
        }
        else if (importType === 'packs') {
          const packData = {
            title: row[0],
            description: row[1] || '',
            price: parseFloat(row[2]) * 100 || 0,
            category: row[3] || 'Hip Hop',
            user_id: user.id,
            is_active: true
          };

          if (!packData.title) {
            errors.push({ row: rowNum, error: "Title is required" });
            continue;
          }

          if (!dryRun) {
            const { data, error } = await supabaseService
              .from('sample_packs')
              .insert(packData)
              .select()
              .single();

            if (error) {
              errors.push({ row: rowNum, error: error.message });
            } else {
              results.push({ row: rowNum, id: data.id, type: 'pack', title: packData.title });
            }
          } else {
            results.push({ row: rowNum, preview: packData, type: 'pack', valid: true });
          }
        }
      } catch (error) {
        errors.push({ row: rowNum, error: error.message });
      }
    }

    logStep("Import completed", { 
      totalRows: csvData.length,
      successCount: results.length,
      errorCount: errors.length,
      dryRun
    });

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      results,
      errors,
      summary: {
        totalRows: csvData.length,
        successCount: results.length,
        errorCount: errors.length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("Error in bulk import", { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});