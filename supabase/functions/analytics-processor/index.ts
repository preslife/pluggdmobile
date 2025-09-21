import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const events: AnalyticsEvent[] = await req.json();
      
      // Process multiple events in batch
      const processedEvents = events.map(event => ({
        user_id: event.userId,
        event_name: event.eventName,
        properties: event.properties || {},
        session_id: event.sessionId,
        created_at: event.timestamp ? new Date(event.timestamp) : new Date(),
      }));

      const { error } = await supabase
        .from('analytics_events')
        .insert(processedEvents);

      if (error) throw error;

      console.log('Analytics events processed:', processedEvents.length);

      return new Response(JSON.stringify({ 
        success: true, 
        processed: processedEvents.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      const eventName = url.searchParams.get('eventName');
      const days = parseInt(url.searchParams.get('days') || '30');

      if (!userId) {
        throw new Error('userId parameter required');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (eventName) {
        query = query.eq('event_name', eventName);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate data by event type and day
      const aggregated = data.reduce((acc: any, event: any) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        const key = `${event.event_name}_${date}`;
        
        if (!acc[key]) {
          acc[key] = {
            event_name: event.event_name,
            date,
            count: 0,
            properties: {}
          };
        }
        
        acc[key].count++;
        return acc;
      }, {});

      return new Response(JSON.stringify({
        events: data,
        aggregated: Object.values(aggregated)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in analytics-processor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);