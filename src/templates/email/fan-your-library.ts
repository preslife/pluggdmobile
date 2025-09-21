export const fanYourLibraryTemplate = {
  subject: "🎵 Your Growing Music Library",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Your Music Collection is Growing! 🎵</h1>
      <p>Hi ${data.name || 'Music Lover'},</p>
      
      <p>Thanks for your recent purchase! Your music library is expanding with amazing beats and tracks.</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📚 Your Library Stats</h3>
        <ul>
          <li>🎵 Total Tracks: ${data.total_tracks || 1}</li>
          <li>💰 Total Spent: ${data.formatCredits ? data.formatCredits(data.total_spent || 0) : (data.total_spent || 0) + ' credits'}</li>
          <li>👥 Creators Supported: ${data.creators_supported || 1}</li>
        </ul>
      </div>

      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💡 Maximize Your Experience</h3>
        <ul>
          <li>Create playlists to organize your collection</li>
          <li>Follow your favorite creators for updates</li>
          <li>Share tracks you love to earn more credits</li>
        </ul>
      </div>

      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🎁 Special Offer</h3>
        <p>Save on your next purchase! Bundle deals give you more music for fewer credits.</p>
      </div>

      <p>Explore more music: <a href="${data.marketplace_url}" style="color: #2563eb;">Visit Marketplace</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};