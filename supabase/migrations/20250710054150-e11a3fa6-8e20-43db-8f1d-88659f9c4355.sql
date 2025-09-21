-- Create sample course: Mastering Basics: Making Your Tracks DSP-Ready
INSERT INTO public.courses (
  id,
  title,
  description,
  instructor_id,
  content,
  difficulty_level,
  duration_hours,
  price,
  tags,
  thumbnail_url,
  is_published
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Mastering Basics: Making Your Tracks DSP-Ready',
  'A Comprehensive Guide to Digital Service Provider Optimization. Learn how to prepare your music for streaming platforms with proper loudness, formatting, and technical optimization.',
  '550e8400-e29b-41d4-a716-446655440001', -- Placeholder instructor ID
  '[
    {
      "id": "module-1-lesson-1",
      "title": "What is a DSP?",
      "type": "text",
      "content": "# Defining Digital Service Providers (DSPs)\n\nIn the contemporary music industry, the term \"DSP\" primarily refers to Digital Service Providers. These are online platforms that facilitate the distribution and consumption of digital music content. Essentially, DSPs act as intermediaries between music creators (artists, labels, distributors) and the global audience.\n\n## Examples of Major DSPs\n\nThe landscape of major DSPs is dominated by several key players:\n\n- **Spotify**: Arguably the largest music streaming service globally\n- **Apple Music**: Apple''s subscription-based streaming service\n- **Tidal**: Positioned as a high-fidelity streaming service\n- **Amazon Music**: Offering various tiers including Prime Music\n- **YouTube Music**: Google''s dedicated music streaming service\n- **Deezer**: A global streaming service with strong European presence\n- **Pandora**: Primarily known for internet radio service\n\n## The Role of DSPs in Music Consumption Today\n\nDSPs have become the primary gateway for music consumption in the 21st century. Their role extends beyond merely hosting music; they are central to:\n\n1. **Discovery**: Through algorithmic recommendations and curated playlists\n2. **Accessibility**: Music available anytime, anywhere, on multiple devices\n3. **Monetization**: Revenue through subscriptions and advertising\n4. **Global Reach**: Artists can reach worldwide audiences\n5. **Data and Analytics**: Valuable listener behavior insights",
      "duration": 15,
      "completed": false
    },
    {
      "id": "module-1-lesson-2", 
      "title": "Why ''DSP-Ready'' Matters",
      "type": "text",
      "content": "# The Importance of Optimizing Tracks for Streaming Platforms\n\nIn the age of digital music, simply creating a great track is not enough. To ensure your music sounds its best and reaches the widest possible audience, it''s crucial to optimize it for Digital Service Providers (DSPs).\n\n## How Loudness Normalization Affects Your Music\n\nOne of the most critical aspects of making your tracks DSP-ready is understanding loudness normalization. Most major DSPs now use loudness normalization algorithms that automatically adjust playback volume to a target loudness level, measured in LUFS (Loudness Units Full Scale).\n\n### Key Points:\n- If your track is mastered louder than the platform''s target, it will be turned down\n- Focus on balanced, dynamic masters rather than maximum loudness\n- The \"loudness war\" is over - dynamic range is more important\n\n## The Impact of File Formats and Metadata\n\nBeyond loudness, file format and metadata play crucial roles:\n\n- **File Format**: Start with high-quality, lossless source files (WAV/FLAC)\n- **Metadata**: Include accurate artist name, track title, ISRC codes, etc.\n- **Proper preparation ensures smooth distribution and discoverability**",
      "duration": 12,
      "completed": false
    },
    {
      "id": "module-2-lesson-1",
      "title": "Understanding Loudness: LUFS and Normalization", 
      "type": "text",
      "content": "# What is LUFS and How is it Measured?\n\nLUFS (Loudness Units Full Scale) is a standardized measurement of audio loudness that accounts for how the human ear perceives sound. Unlike traditional peak meters, LUFS provides a more accurate representation of perceived loudness.\n\n## Three Types of LUFS Measurements:\n\n1. **Momentary Loudness**: Measures over ~400 milliseconds\n2. **Short-Term Loudness**: Measures over ~3 seconds  \n3. **Integrated Loudness**: Average loudness of entire track (most important for streaming)\n\n## Loudness Normalization Explained\n\nStreaming services adjust playback volume to consistent target levels:\n- Tracks louder than target → turned down\n- Tracks quieter than target → may be turned up\n- Goal: eliminate jarring volume differences between songs\n\n## Target Loudness Levels for Major DSPs\n\n| Streaming Service | Target Integrated LUFS |\n|------------------|------------------------|\n| Spotify | -14 LUFS |\n| Apple Music | -16 LUFS |\n| Tidal | -14 LUFS (HiFi), -16 LUFS (Master) |\n| YouTube Music | -14 LUFS |\n| Amazon Music | -14 LUFS |\n\n**Pro Tip**: Master slightly below these targets (e.g., -15 LUFS for Spotify) for extra headroom.",
      "duration": 18,
      "completed": false
    },
    {
      "id": "module-2-lesson-2",
      "title": "Taming the Peaks: True Peak Limiting",
      "type": "text", 
      "content": "# What is True Peak and Why is it Important?\n\nIn digital audio, when discrete samples are converted back to analog, the reconstruction process can create peaks higher than the original digital samples. These **inter-sample peaks** or \"True Peaks\" can exceed 0 dBFS, leading to distortion.\n\n## Understanding True Peaks:\n- Standard peak meters may miss inter-sample peaks\n- True Peak meters use oversampling to detect these peaks\n- Critical for preventing clipping during playback and lossy compression\n\n## How to Use a True Peak Limiter Effectively\n\n### Best Practices:\n\n1. **Placement**: Last processor in your mastering chain\n2. **Target Level**: -1.0 dBTP or -0.1 dBTP maximum\n3. **Gain Reduction**: Minimal - only a few dB to maintain dynamics\n4. **Listen Critically**: Test on various playback systems\n\n### Recommended True Peak Levels:\n- **General Recommendation**: -1.0 dBTP maximum\n- **Some Services**: May tolerate up to -0.1 dBTP\n- **Safe Practice**: Stick to -1.0 dBTP for universal compatibility\n\n## The Bottom Line\nProper True Peak limiting ensures your music sounds clean and professional across all digital platforms without unwanted artifacts.",
      "duration": 16,
      "completed": false
    },
    {
      "id": "module-2-lesson-3",
      "title": "Choosing the Right Format: File Types and Bitrate",
      "type": "text",
      "content": "# Lossy vs. Lossless Audio Formats\n\nUnderstanding audio formats is crucial for maintaining quality throughout the distribution chain.\n\n## Lossless Formats (Recommended for Masters):\n\n### WAV (Waveform Audio File Format)\n- **Pros**: Universal compatibility, no compression\n- **Cons**: Large file sizes\n- **Best for**: Master files, professional distribution\n\n### FLAC (Free Lossless Audio Codec)\n- **Pros**: Smaller than WAV, supports metadata\n- **Cons**: Not universally supported by all software\n- **Best for**: Archival, high-quality distribution\n\n## Lossy Formats (Used by Streaming Services):\n\n### MP3 (MPEG Audio Layer III)\n- **Bitrates**: 128-320 kbps\n- **Usage**: Older streaming services, downloads\n- **Quality**: Good at 320 kbps, noticeable artifacts at lower rates\n\n### AAC (Advanced Audio Coding)\n- **Bitrates**: 128-256 kbps typically\n- **Usage**: Apple Music, YouTube, many modern services\n- **Quality**: Better than MP3 at same bitrate\n\n### OGG Vorbis\n- **Usage**: Spotify, some indie platforms\n- **Quality**: Excellent compression efficiency\n\n## Recommendations for Distribution:\n1. **Always start with 24-bit/48kHz WAV or FLAC masters**\n2. **Let your distributor handle format conversion**\n3. **Avoid uploading pre-compressed files**\n4. **Test your masters on various formats before release**",
      "duration": 14,
      "completed": false
    },
    {
      "id": "module-3-lesson-1", 
      "title": "Metadata Best Practices",
      "type": "text",
      "content": "# Don''t Forget the Details: Metadata Best Practices\n\nProper metadata is essential for discoverability, royalty tracking, and professional presentation of your music.\n\n## Essential Metadata Fields:\n\n### Basic Information:\n- **Track Title**: Clear, consistent formatting\n- **Artist Name**: Exactly as you want it displayed\n- **Album/Release Title**: Consistent with other tracks\n- **Genre**: Choose accurately for better discovery\n- **Release Date**: Important for playlist consideration\n\n### Professional Codes:\n- **ISRC**: International Standard Recording Code (unique per track)\n- **UPC/EAN**: Universal Product Code for releases\n- **Publisher Info**: For royalty collection\n- **Songwriter Credits**: Legal and financial necessity\n\n## Metadata Best Practices:\n\n1. **Consistency is Key**: Use identical spelling/formatting across all platforms\n2. **Avoid Special Characters**: Stick to standard alphanumeric characters\n3. **Genre Selection**: Research platform-specific genre categories\n4. **Credits**: Include all contributors (producers, writers, performers)\n5. **Explicit Content**: Mark accurately to avoid platform issues\n\n## Common Metadata Mistakes:\n- Inconsistent artist names across releases\n- Missing or incorrect ISRC codes\n- Inadequate songwriter credits\n- Poor genre categorization\n- Incomplete album information\n\n**Remember**: Good metadata = better discoverability = more streams!",
      "duration": 10,
      "completed": false
    },
    {
      "id": "module-3-lesson-2",
      "title": "Working with Distributors", 
      "type": "text",
      "content": "# Delivering Your Masterpiece: Working with Distributors\n\nDistributors are your gateway to getting music on major DSPs. Understanding how to work with them effectively is crucial for successful releases.\n\n## Types of Distributors:\n\n### Digital Aggregators:\n- **Examples**: DistroKid, CD Baby, TuneCore, Amuse\n- **Pros**: Easy to use, affordable, direct access\n- **Cons**: Limited promotional support, basic analytics\n\n### Traditional Distributors:\n- **Examples**: AWAL, Symphonic, The Orchard\n- **Pros**: Better promotion, detailed analytics, industry connections\n- **Cons**: Higher barriers to entry, revenue sharing\n\n### Label Services:\n- **Examples**: Believe, EMPIRE, UnitedMasters\n- **Pros**: Full-service approach, marketing support\n- **Cons**: Often require exclusivity, higher revenue splits\n\n## Preparing for Distribution:\n\n### Technical Requirements:\n1. **Audio Files**: High-quality WAV/FLAC (24-bit/48kHz recommended)\n2. **Artwork**: Minimum 3000x3000 pixels, RGB color space\n3. **Metadata**: Complete and accurate information\n4. **Release Strategy**: Plan your timeline (2-4 weeks advance notice)\n\n### Key Considerations:\n- **Release Date Planning**: Allow time for playlist pitching\n- **Territory Selection**: Worldwide vs. specific regions\n- **Pricing Strategy**: Free vs. premium tiers\n- **Content ID**: Protect against unauthorized use\n- **Analytics Access**: Ensure you get performance data\n\n## Pro Tips:\n- Upload at least 2 weeks before release date\n- Keep master files organized and backed up\n- Communicate clearly with your distributor\n- Monitor releases across all platforms\n- Build relationships for future releases",
      "duration": 13,
      "completed": false
    }
  ]'::jsonb,
  'intermediate',
  4,
  49.99,
  ARRAY['audio engineering', 'mastering', 'streaming', 'dsp', 'music production'],
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
  true
);