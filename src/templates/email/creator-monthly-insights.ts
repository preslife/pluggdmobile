export const creatorMonthlyInsightsTemplate = {
  subject: "📊 Your Monthly Creator Insights",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Your Monthly Performance Report 📊</h1>
      <p>Hi ${data.name || 'Creator'},</p>
      
      <p>Here's how you performed this month on Pluggd:</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📈 Your Stats</h3>
        <ul>
          <li>💰 Total Earnings: ${data.formatCredits ? data.formatCredits(data.monthly_earnings || 0) : (data.monthly_earnings || 0) + ' credits'}</li>
          <li>🎵 New Listeners: ${data.new_listeners || 0}</li>
          <li>👥 Referral Signups: ${data.referral_signups || 0}</li>
          <li>📊 Beat Plays: ${data.beat_plays || 0}</li>
        </ul>
      </div>

      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🎯 Goals for Next Month</h3>
        <p>Based on your performance, here are some recommendations:</p>
        <ul>
          <li>Upload ${Math.max(3, Math.floor((data.monthly_earnings || 0) / 100))} new beats</li>
          <li>Share your music on social media weekly</li>
          <li>Engage with your growing fanbase</li>
        </ul>
      </div>

      <p>Keep up the amazing work! <a href="${data.dashboard_url}" style="color: #2563eb;">View detailed analytics</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};