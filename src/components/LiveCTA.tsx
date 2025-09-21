import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const LiveCTA = () => {
  const location = useLocation();
  const redirectParam = encodeURIComponent(location.pathname + location.search);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-auto z-40">
      <div className="rounded-full border border-border bg-card/80 backdrop-blur shadow-lg p-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground px-3">Ready to level up with creators on pluggd.fm?</p>
        <Link to={`/auth?redirect=${redirectParam}`}><Button className="ml-3">Join the Community</Button></Link>
      </div>
    </div>
  );
};
export default LiveCTA;
