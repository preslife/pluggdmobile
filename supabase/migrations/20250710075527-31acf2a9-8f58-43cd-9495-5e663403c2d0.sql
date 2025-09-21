-- Add sample quiz content to existing course or create a sample course with quiz
-- First, let's create a sample course with quiz content if it doesn't exist

INSERT INTO courses (
  title,
  description,
  instructor_id,
  content,
  duration_hours,
  difficulty_level,
  price,
  is_published,
  tags
) VALUES (
  'Mastering Basics: Making Your Tracks DSP-Ready',
  'Learn the essential techniques to prepare your music for digital streaming platforms with interactive quizzes to test your knowledge.',
  '00000000-0000-0000-0000-000000000000',
  '[
    {
      "id": "lesson-1",
      "title": "What is a DSP?",
      "type": "text",
      "duration": 15,
      "content": "# Understanding Digital Service Providers\n\nDigital Service Providers (DSPs) are platforms that distribute and stream music digitally. Examples include:\n\n- **Spotify** - The world''s largest music streaming platform\n- **Apple Music** - Apple''s premium music service\n- **Amazon Music** - Amazon''s streaming service\n- **YouTube Music** - Google''s music platform\n\n## Why DSP-Ready Matters\n\nPreparing your tracks for DSPs ensures:\n1. Optimal sound quality\n2. Proper metadata\n3. Maximum discoverability\n4. Professional presentation\n\nUnderstanding these platforms is crucial for modern music distribution."
    },
    {
      "id": "lesson-2", 
      "title": "Why ''DSP-Ready'' Matters",
      "type": "text",
      "duration": 12,
      "content": "# The Importance of DSP Optimization\n\nMaking your tracks DSP-ready isn''t just about technical requirements - it''s about maximizing your music''s potential in the digital marketplace.\n\n## Key Benefits\n\n### Audio Quality\n- Proper loudness standards (LUFS)\n- Clean, professional mixes\n- Optimal file formats\n\n### Discoverability\n- Correct metadata tagging\n- Genre classification\n- Release information\n\n### Professional Presentation\n- High-quality artwork\n- Consistent branding\n- Complete track information\n\nWhen your music meets DSP standards, it has a better chance of being featured in playlists and recommended to listeners."
    },
    {
      "id": "lesson-3",
      "title": "Understanding Loudness: LUF Standards",
      "type": "text", 
      "duration": 18,
      "content": "# Mastering Loudness for Streaming\n\n## What is LUFS?\n\nLUFS (Loudness Units relative to Full Scale) is the standard measurement for perceived loudness used by streaming platforms.\n\n### Target LUFS by Platform:\n- **Spotify**: -14 LUFS\n- **Apple Music**: -16 LUFS  \n- **YouTube**: -14 LUFS\n- **Amazon Music**: -16 LUFS\n\n## Peak Limiting\n\nPeak limiting prevents digital clipping:\n- Keep true peaks below -1 dBTP\n- Use a quality limiter\n- Avoid over-compression\n\n## Best Practices\n\n1. **Mix at proper levels** - Don''t rely on mastering to fix level issues\n2. **Use reference tracks** - Compare your loudness to professionally mastered music\n3. **Check multiple platforms** - Test how your music sounds on different DSPs\n4. **Leave headroom** - Allow space for the mastering process\n\nProper loudness management ensures your music sounds great across all platforms and playback systems."
    },
    {
      "id": "lesson-4",
      "title": "Taming the Peaks: True Peak Limiting",
      "type": "text",
      "duration": 16, 
      "content": "# Advanced Peak Management\n\n## Understanding True Peaks\n\nTrue peaks occur during digital-to-analog conversion and can cause distortion even if your digital peaks seem fine.\n\n### Why True Peaks Matter:\n- Prevent distortion in consumer devices\n- Ensure consistent playback quality\n- Meet streaming platform requirements\n- Maintain professional sound quality\n\n## Implementation Strategies\n\n### 1. Oversampling\n- Use oversampled limiters\n- 4x oversampling minimum\n- Higher rates for critical applications\n\n### 2. Look-Ahead Time\n- Set appropriate look-ahead (5-10ms)\n- Balance transparency vs. limiting\n- Consider genre-specific needs\n\n### 3. Release Settings\n- Fast release for transients\n- Slower release for sustain\n- Auto-release features\n\n## Measurement Tools\n\nUse professional meters that show:\n- True peak levels\n- LUFS measurements  \n- Real-time analysis\n- Historical data\n\nMastering true peak limiting is essential for professional-sounding releases that translate well across all playback systems."
    },
    {
      "id": "lesson-5",
      "title": "Choosing the Right Format: File Format for DSPs",
      "type": "text",
      "duration": 14,
      "content": "# Optimal File Formats for Digital Distribution\n\n## Recommended Formats\n\n### For Distribution:\n- **WAV**: 24-bit/44.1kHz or 48kHz\n- **AIFF**: Alternative to WAV, same quality\n- **FLAC**: Lossless compression, smaller files\n\n### Avoid:\n- MP3 for masters (lossy compression)\n- Low sample rates (below 44.1kHz)\n- 32-bit float (not supported by all platforms)\n\n## Sample Rate Considerations\n\n### 44.1kHz\n- Standard for CD quality\n- Widely supported\n- Efficient file sizes\n\n### 48kHz  \n- Video standard\n- Some prefer for mastering\n- Slightly larger files\n\n### Higher Rates (96kHz+)\n- Not necessary for distribution\n- Larger file sizes\n- Limited platform support\n\n## Bit Depth\n\n### 16-bit\n- CD standard\n- Sufficient for final delivery\n- Smaller file sizes\n\n### 24-bit\n- Preferred for mastering\n- More headroom\n- Better for processing\n\nChoose formats that balance quality with practicality for your distribution needs."
    },
    {
      "id": "lesson-6",
      "title": "Metadata Best Practices",
      "type": "quiz",
      "duration": 10,
      "content": "# Testing Your Knowledge\n\nNow let''s test what you''ve learned about metadata and DSP preparation with this interactive quiz.",
      "quiz": {
        "questions": [
          {
            "id": "q1",
            "question": "What is the recommended LUFS target for Spotify?",
            "options": [
              "-12 LUFS",
              "-14 LUFS", 
              "-16 LUFS",
              "-18 LUFS"
            ],
            "correctAnswer": 1,
            "explanation": "Spotify uses -14 LUFS as their loudness target. Tracks louder than this will be turned down, while quieter tracks may be turned up if loudness normalization is enabled."
          },
          {
            "id": "q2", 
            "question": "Which file format is best for distributing masters to DSPs?",
            "options": [
              "MP3 320kbps",
              "WAV 16-bit/44.1kHz",
              "WAV 24-bit/44.1kHz",
              "FLAC 16-bit/48kHz"
            ],
            "correctAnswer": 2,
            "explanation": "WAV 24-bit/44.1kHz provides the best balance of quality and compatibility for distribution. The extra bit depth preserves audio quality while 44.1kHz is the standard sample rate."
          },
          {
            "id": "q3",
            "question": "What should true peaks be limited to prevent distortion?",
            "options": [
              "0 dBTP",
              "-0.3 dBTP", 
              "-1 dBTP",
              "-3 dBTP"
            ],
            "correctAnswer": 2,
            "explanation": "True peaks should be limited to -1 dBTP or lower to prevent intersample peaks that can cause distortion during digital-to-analog conversion in consumer devices."
          },
          {
            "id": "q4",
            "question": "Which metadata field is most important for discoverability?",
            "options": [
              "Track number",
              "Genre",
              "Producer credits", 
              "Recording date"
            ],
            "correctAnswer": 1,
            "explanation": "Genre is crucial for discoverability as it helps DSPs categorize your music and recommend it to the right audience through algorithmic playlists and genre-based browsing."
          }
        ],
        "passingScore": 75
      }
    }
  ]'::jsonb,
  4,
  'intermediate',
  0,
  true,
  ARRAY['audio engineering', 'mastering', 'dsp', 'streaming']
);