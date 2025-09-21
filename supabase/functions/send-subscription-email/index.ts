import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  event: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_failed';
  customerName?: string;
  planName?: string;
  amount?: number;
  nextBillingDate?: string;
}

const getEmailContent = (event: string, data: EmailRequest) => {
  const { customerName = 'Customer', planName, amount, nextBillingDate } = data;
  
  switch (event) {
    case 'subscription_created':
      return {
        subject: 'Welcome to Your Premium Subscription!',
        html: `
          <h1>Welcome ${customerName}!</h1>
          <p>Thank you for subscribing to our ${planName} plan.</p>
          <p>Your subscription is now active and you have access to all premium features.</p>
          ${amount ? `<p>Amount: $${(amount / 100).toFixed(2)}</p>` : ''}
          ${nextBillingDate ? `<p>Next billing date: ${new Date(nextBillingDate).toLocaleDateString()}</p>` : ''}
          <p>Start exploring your premium features now!</p>
          <p>Best regards,<br>The Team</p>
        `
      };
    
    case 'subscription_updated':
      return {
        subject: 'Subscription Updated Successfully',
        html: `
          <h1>Hi ${customerName}!</h1>
          <p>Your subscription has been successfully updated.</p>
          ${planName ? `<p>New plan: ${planName}</p>` : ''}
          ${amount ? `<p>New amount: $${(amount / 100).toFixed(2)}</p>` : ''}
          ${nextBillingDate ? `<p>Next billing date: ${new Date(nextBillingDate).toLocaleDateString()}</p>` : ''}
          <p>Thank you for staying with us!</p>
          <p>Best regards,<br>The Team</p>
        `
      };
    
    case 'subscription_cancelled':
      return {
        subject: 'Subscription Cancelled',
        html: `
          <h1>Hi ${customerName}!</h1>
          <p>We're sorry to see you go. Your subscription has been cancelled.</p>
          <p>You'll continue to have access to premium features until the end of your current billing period.</p>
          <p>If you change your mind, you can resubscribe anytime.</p>
          <p>Thank you for being with us!</p>
          <p>Best regards,<br>The Team</p>
        `
      };
    
    case 'payment_failed':
      return {
        subject: 'Payment Failed - Action Required',
        html: `
          <h1>Hi ${customerName}!</h1>
          <p>We were unable to process your payment for your subscription.</p>
          <p>Please update your payment method to continue your subscription.</p>
          <p>You can update your payment information in your account settings.</p>
          <p>If you need help, please contact our support team.</p>
          <p>Best regards,<br>The Team</p>
        `
      };
    
    default:
      return {
        subject: 'Subscription Update',
        html: `
          <h1>Hi ${customerName}!</h1>
          <p>There's been an update to your subscription.</p>
          <p>Please check your account for more details.</p>
          <p>Best regards,<br>The Team</p>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { email, event } = emailData;

    if (!email || !event) {
      throw new Error("Email and event are required");
    }

    const emailContent = getEmailContent(event, emailData);

    const emailResponse = await resend.emails.send({
      from: "Subscriptions <onboarding@resend.dev>",
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Subscription email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);