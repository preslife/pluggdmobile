
import DrumMachine from "@/components/DrumMachine";
import { usePageMetadata } from "@/hooks/usePageMetadata";

const XBEATSTUDIO = () => {
  usePageMetadata({
    title: "XBeat Studio — Pluggd",
    description: "Experiment with the XBeat drum machine and build rhythmic ideas right in your browser.",
    path: "/xbeatstudio",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-4">
        <DrumMachine />
      </div>
    </div>
  );
};

export default XBEATSTUDIO;