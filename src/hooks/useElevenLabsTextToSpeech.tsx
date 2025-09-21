import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TextToSpeechOptions {
  voicePrompt?: string;
  actingInstructions?: string;
}

export const useElevenLabsTextToSpeech = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateSpeech = async (
    text: string, 
    options: TextToSpeechOptions = {}
  ): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Please provide text to convert to speech');
      return null;
    }

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      console.log('Calling ElevenLabs function with text:', text.trim());
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-text-to-speech', {
        body: {
          text: text.trim(),
          voice_prompt: options.voicePrompt || "A warm, friendly, and professional educator with clear diction",
          acting_instructions: options.actingInstructions || "Speak clearly and naturally with appropriate emphasis and emotion"
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data) {
        throw new Error('No data received from function');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // If we get audio content (base64), convert it to a blob URL
      if (data.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        return url;
      }

      // If we get a direct URL
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        return data.audioUrl;
      }

      throw new Error('No audio data received');

    } catch (error) {
      console.error('ElevenLabs TTS Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate speech');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAudio = () => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  };

  return {
    generateSpeech,
    clearAudio,
    isGenerating,
    audioUrl
  };
};