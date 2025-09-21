export const fanWelcomeTemplate = {
  subject: "Welcome to Pluggd - Discover Amazing Music! 🎵",
  html: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Welcome to Pluggd Exclusive Music Hub!</h1>
      <p>Hi ${data.name || 'Music Lover'},</p>
      
      <p>Welcome to the Pluggd community! You now have access to exclusive music, beats, and content from amazing creators.</p>

      ${data.signup_bonus ? `
        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🎁 Welcome Bonus!</h3>
          <p>You've received ${data.formatCredits ? data.formatCredits(data.signup_bonus) : data.signup_bonus + ' credits'} as a welcome gift!</p>
        </div>
      ` : ''}

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>What You Can Do:</h3>
        <ul>
          <li>🎵 Discover and purchase exclusive beats</li>
          <li>💝 Tip your favorite creators</li>
          <li>🔗 Share music and earn credits</li>
          <li>📚 Access premium courses and content</li>
        </ul>
      </div>

      <p>Start exploring: <a href="${data.browse_url}" style="color: #2563eb;">Browse Music</a></p>
      
      <p>Best regards,<br>The Pluggd Team</p>
    </div>
  `
};