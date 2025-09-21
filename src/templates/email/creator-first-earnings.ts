export const creatorFirstEarningsTemplate = {
  subject: "🎉 Congratulations on Your First Earnings!",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #16a34a;">You Just Earned Your First Credits! 🎉</h1>
      <p>Hi ${data.name || 'Creator'},</p>
      
      <p>Amazing news! You've just earned your first ${data.formatCredits ? data.formatCredits(data.credits_earned || 0) : (data.credits_earned || 0) + ' credits'} on Pluggd!</p>

      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>What You Can Do With Credits:</h3>
        <ul>
          <li>💳 Cash out to your bank account</li>
          <li>🔄 Apply to your subscription for discounts</li>
          <li>💝 Tip other creators you love</li>
        </ul>
      </div>

      <p>Keep creating amazing content - your audience is growing!</p>
      
      <p><a href="${data.wallet_url}" style="color: #2563eb;">View Your Wallet</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};