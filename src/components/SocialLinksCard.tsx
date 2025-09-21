
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Instagram, Twitter, Youtube, Link2, Music2, ShoppingBag } from "lucide-react";

type Props = {
  userId: string;
  className?: string;
};

type ProfileLinks = {
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  soundcloud_url?: string | null;
  website_url?: string | null;
  tiktok_url?: string | null;
  merch_url?: string | null;
};

const LinkRow = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted transition-colors"
  >
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span className="truncate">{label}</span>
  </a>
);

export const SocialLinksCard = ({ userId, className }: Props) => {
  const [links, setLinks] = useState<ProfileLinks | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("instagram_url, twitter_url, youtube_url, soundcloud_url, website_url, tiktok_url, merch_url")
        .eq("user_id", userId)
        .maybeSingle();
      setLinks((data as unknown) as ProfileLinks);
      setLoading(false);
    };
    load();
  }, [userId]);

  const entries =
    links
      ? ([
          links.website_url && { href: links.website_url, label: "Website", icon: Globe },
          links.instagram_url && { href: links.instagram_url, label: "Instagram", icon: Instagram },
          links.twitter_url && { href: links.twitter_url, label: "Twitter/X", icon: Twitter },
          links.youtube_url && { href: links.youtube_url, label: "YouTube", icon: Youtube },
          links.soundcloud_url && { href: links.soundcloud_url, label: "SoundCloud", icon: Music2 },
          links.merch_url && { href: links.merch_url, label: "Merch", icon: ShoppingBag },
          links.tiktok_url && { href: links.tiktok_url, label: "TikTok", icon: Link2 },
        ].filter(Boolean) as { href: string; label: string; icon: any }[])
      : [];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Social</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!entries.length) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Social</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {entries.map((e, i) => (
            <LinkRow key={i} href={e.href} label={e.label} icon={e.icon} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialLinksCard;
