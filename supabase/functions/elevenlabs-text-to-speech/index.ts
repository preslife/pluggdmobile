import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('ElevenLabs TTS function called with method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing TTS request...')
    
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body parsed:', requestBody)
    } catch (e) {
      console.error('JSON parse error:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    
    const { text, voice_prompt } = requestBody

    if (!text) {
      console.error('No text provided in request')
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Clean and limit text for ElevenLabs (remove markdown, limit length)
    let cleanText = text
      .replace(/#+\s*/g, '') // Remove markdown headers
      .replace(/\*\*/g, '') // Remove bold formatting  
      .replace(/\*/g, '') // Remove italic formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
      .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
      .trim()

    // Limit to 2000 characters (safe limit for ElevenLabs)
    if (cleanText.length > 2000) {
      cleanText = cleanText.substring(0, 2000) + '...'
      console.log('Text truncated to 2000 characters')
    }

    console.log('Processing text length:', cleanText.length)

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')

    if (!elevenLabsApiKey) {
      console.error('ELEVENLABS_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('Making request to ElevenLabs API...')

    // Use Sarah voice (educational/professional sounding)
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'  // Sarah - good for educational content
    
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: cleanText, // Use cleaned text instead of original
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.3,
          use_speaker_boost: true
        }
      }),
    })

    console.log('ElevenLabs API response status:', elevenLabsResponse.status)

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', errorText)
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${errorText}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get the audio as array buffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    console.log('Audio received, size:', audioBuffer.byteLength)
    
    // Convert to base64
    const audioBase64 = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    )
    
    console.log('TTS generation successful')
    
    return new Response(
      JSON.stringify({ 
        audioContent: audioBase64,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
    
  } catch (error) {
    console.error('Unexpected error in TTS function:', error)
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})