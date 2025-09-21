import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCookies } from "react-cookie";

export const useReferralTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [cookies, setCookie] = useCookies(['referral_code']);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const referrerCode = urlParams.get('ref');
    
    if (referrerCode && referrerCode !== cookies.referral_code) {
      // Set 30-day referral cookie
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      setCookie('referral_code', referrerCode, { 
        expires: expiryDate, 
        path: '/',
        sameSite: 'lax'
      });
      
      console.log('Referral code captured:', referrerCode);
    }
    
    if (user && cookies.referral_code) {
      // Track referral signup if user just signed up
      processReferralSignup(cookies.referral_code, user.id);
    }
  }, [location.search, user, cookies.referral_code, setCookie]);

  const processReferralSignup = async (referrerCode: string, userId: string) => {
    try {
      await supabase.functions.invoke('process-referral-rewards', {
        body: {
          user_id: userId,
          event_type: 'signup',
          referrer_code: referrerCode
        }
      });
    } catch (error) {
      console.error('Error processing referral signup:', error);
    }
  };

  return { referralCode: cookies.referral_code };
};