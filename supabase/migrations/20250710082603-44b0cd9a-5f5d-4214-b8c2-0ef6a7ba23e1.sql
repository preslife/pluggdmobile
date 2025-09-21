-- Add a quiz lesson to the existing DSP course
UPDATE courses 
SET content = content || '[{
  "id": "module-quiz-1",
  "title": "DSP Knowledge Quiz",
  "type": "quiz",
  "duration": 15,
  "content": "{\"questions\":[{\"id\":\"q1\",\"question\":\"What does DSP stand for in the music industry?\",\"options\":[\"Digital Service Provider\",\"Digital Sound Processor\",\"Digital Signal Processing\",\"Dynamic Sound Platform\"],\"correctAnswer\":0,\"explanation\":\"DSP stands for Digital Service Provider - platforms like Spotify, Apple Music, etc.\"},{\"id\":\"q2\",\"question\":\"What is the target LUFS level for Spotify?\",\"options\":[\"-16 LUFS\",\"-14 LUFS\",\"-12 LUFS\",\"-18 LUFS\"],\"correctAnswer\":1,\"explanation\":\"Spotify targets -14 LUFS for loudness normalization.\"},{\"id\":\"q3\",\"question\":\"What is the recommended True Peak level for DSP-ready masters?\",\"options\":[\"-0.5 dBTP\",\"-1.0 dBTP\",\"-2.0 dBTP\",\"0.0 dBTP\"],\"correctAnswer\":1,\"explanation\":\"-1.0 dBTP is the recommended maximum to prevent clipping during playback.\"}],\"passingScore\":70,\"allowRetries\":true}"
}]'::jsonb
WHERE title = 'Mastering Basics: Making Your Tracks DSP-Ready';