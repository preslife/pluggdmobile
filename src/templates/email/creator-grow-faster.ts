export const creatorGrowFasterTemplate = {
  subject: "🚀 Ready to Grow Your Audience Faster?",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Supercharge Your Growth! 🚀</h1>
      <p>Hi ${data.name || 'Creator'},</p>
      
      <p>You're doing great on Pluggd! Here are some proven strategies to grow even faster:</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💰 Earn More with Referrals</h3>
        <p>Share your link and earn ${data.formatCredits ? data.formatCredits(1000) : '1000 credits'} for each friend who makes a purchase!</p>
        <p>Your link: <strong>${data.referral_link}</strong></p>
      </div>

      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📱 Share on Social Media</h3>
        <p>Every share can earn you ${data.formatCredits ? data.formatCredits(200) : '200 credits'} when someone signs up through your post!</p>
      </div>

      <p>Ready to amplify your reach? <a href="${data.dashboard_url}" style="color: #2563eb;">Start sharing now</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};