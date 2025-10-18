import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { usePageMetadata } from "@/hooks/usePageMetadata";
const AirTraxStudio = () => {
  usePageMetadata({
    title: "AirTraX Studio — Pluggd",
    description:
      "Launch the AirTraX gesture-controlled studio to create music with motion capture tools and AI-powered assistance.",
    path: "/airtrax-studio",
  });

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  const handleBackToTools = () => {
    navigate("/tools");
  };
  const handleOpenInNewTab = () => {
    window.open("https://airtrax.netlify.app/", "_blank");
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="pb-4 px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToTools} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Tools
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AirTraX Studio</h1>
                <p className="text-sm text-muted-foreground">Gesture controlled music production</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="relative flex-1">
        {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading AirTrax Studio...</p>
            </div>
          </div>}
        
        <iframe src="https://airtrax.netlify.app/" className="w-full h-[calc(100vh-120px)] border-0" title="AirTrax Studio - AI-Powered Gesture Music Studio" onLoad={handleIframeLoad} allow="camera; microphone; fullscreen" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals" />
      </div>

      {/* Info Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 bg-muted/30 border-t">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-muted-foreground text-center">
            Transform hand gestures into music with cutting-edge AI technology. 
            Grant camera permissions when prompted for full gesture control functionality.
          </p>
        </div>
      </div>
    </div>;
};
export default AirTraxStudio;