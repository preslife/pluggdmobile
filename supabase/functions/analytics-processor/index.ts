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

      // Fan out KPI rows for downstream analytics if present in the payload
      const kpiEvents = events.flatMap((event, index) => {
        const props = event.properties || {};
        const creatorId = event.userId || props.creator_id || props.creatorId;
        if (!creatorId) {
          return [];
        }

        const occurredAt = event.timestamp
          ? new Date(event.timestamp).toISOString()
          : new Date().toISOString();
        const metricDate = occurredAt.split('T')[0];

        const metrics: Array<{ key: string; value: number }> = [];

        if (Array.isArray(props.kpis)) {
          for (const entry of props.kpis) {
            if (!entry) continue;
            const key = entry.key || entry.kpi || entry.metric;
            const numericValue = Number(entry.value ?? entry.kpi_value ?? entry.metric_value);
            if (key && Number.isFinite(numericValue)) {
              metrics.push({ key, value: numericValue });
            }
          }
        }

        if (props.metrics && typeof props.metrics === 'object' && !Array.isArray(props.metrics)) {
          for (const [key, rawValue] of Object.entries(props.metrics)) {
            const numericValue = Number(rawValue);
            if (key && Number.isFinite(numericValue)) {
              metrics.push({ key, value: numericValue });
            }
          }
        }

        const singleKey = props.kpi_key || props.metric || props.kpi;
        const singleValue = props.kpi_value ?? props.metric_value ?? props.value;
        if (singleKey && Number.isFinite(Number(singleValue))) {
          metrics.push({ key: singleKey, value: Number(singleValue) });
        }

        // Provide basic defaults for known events when no explicit metrics are supplied
        if (metrics.length === 0) {
          switch (event.eventName) {
            case 'release_play':
              metrics.push({ key: 'total_streams', value: 1 });
              break;
            case 'video_view':
              metrics.push({ key: 'total_views', value: 1 });
              break;
            case 'post_like':
              metrics.push({ key: 'total_likes', value: 1 });
              break;
            case 'post_comment':
              metrics.push({ key: 'total_comments', value: 1 });
              break;
          }
        }

        return metrics.map(metric => ({
          creator_id: creatorId,
          event_name: event.eventName,
          source: 'analytics-processor',
          occurred_at: occurredAt,
          kpi_key: metric.key,
          kpi_value: metric.value,
          metric_date: metricDate,
          metadata: {
            ...props,
            session_id: event.sessionId ?? null,
            batch_index: index,
          },
        }));
      });

      if (kpiEvents.length > 0) {
        const { error: kpiError } = await supabase
          .from('creator_kpi_events')
          .insert(kpiEvents);

        if (kpiError) {
          console.error('Failed to insert KPI events', kpiError);
        }
      }

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