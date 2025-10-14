import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  booking: {
    id: string;
    service_type: string;
    project_title: string;
    project_description: string;
    budget_range?: string;
    deadline?: string;
    preferred_contact: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    message?: string;
    created_at: string;
  };
  professional: {
    name?: string;
    title?: string;
    profiles?: {
      full_name?: string;
      username?: string;
    };
  };
  client: {
    client_name: string;
    client_email: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking, professional, client }: BookingNotificationRequest = await req.json();

    const professionalName = professional.name || 
                            professional.profiles?.full_name || 
                            professional.profiles?.username || 
                            "Professional";

    // Email to client (confirmation)
    const clientEmailResponse = await resend.emails.send({
      from: "Pluggd <bookings@pluggd.fm>",
      to: [client.client_email],
      subject: `Booking Confirmation - ${booking.project_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Booking Confirmation</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Thank you for your booking request!</h2>
            <p>Your booking request has been submitted successfully. Here are the details:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Professional:</td>
                <td style="padding: 8px 0;">${professionalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Project:</td>
                <td style="padding: 8px 0;">${booking.project_title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Service:</td>
                <td style="padding: 8px 0;">${booking.service_type}</td>
              </tr>
              ${booking.budget_range ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Budget:</td>
                <td style="padding: 8px 0;">${booking.budget_range}</td>
              </tr>
              ` : ''}
              ${booking.deadline ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Deadline:</td>
                <td style="padding: 8px 0;">${new Date(booking.deadline).toLocaleDateString()}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Preferred Contact:</td>
                <td style="padding: 8px 0;">${booking.preferred_contact}</td>
              </tr>
            </table>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Project Description:</h3>
              <p style="margin-bottom: 0;">${booking.project_description}</p>
            </div>
            
            ${booking.message ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Additional Message:</h3>
              <p style="margin-bottom: 0;">${booking.message}</p>
            </div>
            ` : ''}
          </div>
          
          <p>The professional and our admin team have been notified of your request. You should hear back within 24-48 hours.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666;">Booking ID: ${booking.id}</p>
            <p style="color: #666;">Submitted: ${new Date(booking.created_at).toLocaleString()}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            Best regards,<br>
            The Pluggd Team
          </p>
        </div>
      `,
    });

    // Email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Pluggd <bookings@pluggd.fm>",
      to: ["admin@pluggd.fm"], // Replace with actual admin email
      subject: `New Booking Request - ${booking.project_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">New Booking Request</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>A new booking request has been submitted on the platform:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Client:</td>
                <td style="padding: 8px 0;">${booking.client_name} (${booking.client_email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Professional:</td>
                <td style="padding: 8px 0;">${professionalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Project:</td>
                <td style="padding: 8px 0;">${booking.project_title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Service:</td>
                <td style="padding: 8px 0;">${booking.service_type}</td>
              </tr>
              ${booking.budget_range ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Budget:</td>
                <td style="padding: 8px 0;">${booking.budget_range}</td>
              </tr>
              ` : ''}
              ${booking.deadline ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Deadline:</td>
                <td style="padding: 8px 0;">${new Date(booking.deadline).toLocaleDateString()}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Contact Preference:</td>
                <td style="padding: 8px 0;">${booking.preferred_contact}</td>
              </tr>
              ${booking.client_phone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0;">${booking.client_phone}</td>
              </tr>
              ` : ''}
            </table>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Project Description:</h3>
              <p style="margin-bottom: 0;">${booking.project_description}</p>
            </div>
            
            ${booking.message ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Additional Message:</h3>
              <p style="margin-bottom: 0;">${booking.message}</p>
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666;">Booking ID: ${booking.id}</p>
            <p style="color: #666;">Submitted: ${new Date(booking.created_at).toLocaleString()}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Please follow up with both parties to facilitate the connection.
          </p>
        </div>
      `,
    });

    console.log("Booking notification emails sent successfully:", {
      client: clientEmailResponse,
      admin: adminEmailResponse
    });

    return new Response(JSON.stringify({ 
      success: true, 
      clientEmailId: clientEmailResponse.data?.id,
      adminEmailId: adminEmailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-notification function:", error);
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
