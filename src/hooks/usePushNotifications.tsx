import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = "BK8nG9rZfkCOAwWLxpHlQm7JaY3y2vNlAVrQNlWAOb_ZQgCeEOdFKsQ-u5YkZOZf7_Qp6oQN9AwP_LfGhJv8Y_k";

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = () => {
      setIsSupported(
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );
    };

    // Check current subscription status
    const checkSubscription = async () => {
      if (!isSupported || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        
        // Check database for subscription
        if (subscription) {
          const { data } = await supabase
            .from('web_push_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .single();
          
          if (!data) {
            setIsSubscribed(false);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported, user]);

  const subscribe = async () => {
    if (!isSupported || !user) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    // Avoid prompting on localhost unless explicitly desired
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      toast({ title: "Local Dev", description: "Push is disabled in local dev.", variant: "default" });
      return false;
    }

    try {
      setIsLoading(true);
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ title: "Notifications off", description: "You can enable them later in browser settings.", variant: "default" });
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store subscription in database
      const subscriptionObject = subscription.toJSON();
      const { error } = await supabase
        .from('web_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionObject.endpoint!,
          p256dh: subscriptionObject.keys!.p256dh,
          auth: subscriptionObject.keys!.auth,
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive push notifications from Pluggd.",
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Subscription Failed",
        description: "Failed to enable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !user) return false;

    try {
      setIsLoading(true);
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('web_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Failed to disable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}