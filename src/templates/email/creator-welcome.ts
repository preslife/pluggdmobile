export const creatorWelcomeTemplate = {
  subject: "Welcome to Pluggd - Start Earning with Your Music! 🎵",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Welcome to Pluggd Exclusive Music Hub!</h1>
      <p>Hi ${data.name || 'Creator'},</p>
      
      <p>Congratulations on joining the Pluggd community! As a creator, you now have access to our powerful platform where you can:</p>
      
      <ul>
        <li>🎵 Upload and sell your beats</li>
        <li>💰 Earn credits from tips and purchases</li>
        <li>🔗 Share your referral link to earn even more</li>
        <li>📊 Track your audience analytics</li>
      </ul>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💡 Pro Tip: Invite Friends & Earn Credits!</h3>
        <p>Your referral link: <strong>${data.referral_link}</strong></p>
        <p>When someone signs up with your link and makes their first purchase, you'll earn ${data.formatCredits ? data.formatCredits(1000) : '1000 credits'}!</p>
      </div>

      <p>Ready to get started? <a href="${data.dashboard_url}" style="color: #2563eb;">Visit your dashboard</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};