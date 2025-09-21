export const fanFromCreatorsTemplate = {
  subject: "🎵 New Music from Creators You Follow",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Fresh Beats from Your Favorite Creators! 🎵</h1>
      <p>Hi ${data.name || 'Music Lover'},</p>
      
      <p>Your followed creators have been busy! Check out the latest releases from artists you love:</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🎧 This Week's Releases</h3>
        ${data.new_releases ? data.new_releases.map((release: any) => `
          <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
            <strong>${release.title}</strong> by ${release.artist}<br>
            <small style="color: #6b7280;">${release.genre} • ${release.date}</small>
          </div>
        `).join('') : '<p>No new releases this week</p>'}
      </div>

      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💡 Earn Credits by Sharing</h3>
        <p>Love what you hear? Share it with friends and earn ${data.formatCredits ? data.formatCredits(200) : '200 credits'} when they sign up!</p>
      </div>

      <p>Discover more: <a href="${data.marketplace_url}" style="color: #2563eb;">Visit Marketplace</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};