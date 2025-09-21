import { useEffect } from "react";
import { MailingListForm } from "./MailingListForm";
import pluggdLogo from "@/assets/pluggdt.png";
import { setMeta } from "@/lib/seo";

export const ComingSoon = () => {
  useEffect(() => {
    setMeta(
      "Pluggd - Coming Soon",
      "The ultimate music platform for producers, artists, and creators. Join our mailing list to be the first to know when we launch!",
      "/"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="mb-12">
          <img 
            src={pluggdLogo} 
            alt="Pluggd Logo" 
            className="h-24 md:h-32 mx-auto object-contain"
          />
        </div>

        {/* Coming Soon Content */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Coming Soon
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The ultimate platform for music producers, artists, and creators is launching soon.
          </p>
          
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg">
              🎵 Create, collaborate, and distribute your music
            </p>
            <p className="text-lg">
              💰 Monetize your beats and productions
            </p>
            <p className="text-lg">
              🎯 Connect with artists worldwide
            </p>
          </div>
        </div>

        {/* Email Collection */}
        <div className="max-w-md mx-auto">
          <MailingListForm />
        </div>

        {/* Footer Text */}
        <p className="text-sm text-muted-foreground/70 mt-8">
          Be the first to experience the future of music creation and collaboration.
        </p>
      </div>
    </div>
  );
};