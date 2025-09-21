import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { theme, genre, mood, rhymeScheme, perspective, vibe, instructions } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build a detailed prompt for the AI
    let prompt = `Write lyrics for a ${genre} song with the following specifications:

Theme: ${theme}
Mood: ${mood}
${vibe ? `Vibe: ${vibe}` : ''}
${rhymeScheme ? `Rhyme Scheme: ${rhymeScheme}` : ''}
${perspective ? `Perspective: ${perspective}` : ''}
${instructions ? `Additional Instructions: ${instructions}` : ''}

Please write creative, original lyrics that capture the essence of ${theme}. Make them authentic to the ${genre} genre and ${mood} mood. Include verse sections that tell a story or convey emotion effectively.

Format the output as raw lyrics without additional commentary.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional songwriter and lyricist. Generate creative, original lyrics that are appropriate for the specified genre and mood. Focus on authentic storytelling, meaningful themes, and proper song structure.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedLyrics = data.choices[0].message.content;

    console.log('Successfully generated lyrics for theme:', theme);

    return new Response(JSON.stringify({ lyrics: generatedLyrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lyrics function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});