export const fanUnlockPerksTemplate = {
  subject: "🔓 Unlock Premium Perks with Credits!",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #7c3aed;">Unlock Premium Perks! 🔓</h1>
      <p>Hi ${data.name || 'Music Lover'},</p>
      
      <p>Did you know you can use your ${data.formatCredits ? data.formatCredits(data.current_balance || 0) : (data.current_balance || 0) + ' credits'} for amazing perks?</p>

      <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Ways to Use Your Credits:</h3>
        <ul>
          <li>🎵 Purchase exclusive beats and releases</li>
          <li>💝 Support creators with tips</li>
          <li>🎓 Access premium courses</li>
          <li>⭐ Get subscription discounts</li>
        </ul>
      </div>

      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💡 Earn More Credits</h3>
        <p>Share music with friends and earn ${data.formatCredits ? data.formatCredits(200) : '200 credits'} when they sign up!</p>
      </div>

      <p>Ready to explore? <a href="${data.marketplace_url}" style="color: #2563eb;">Visit Marketplace</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};