import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

const NotFound = () => {
  const location = useLocation();

  usePageMetadata({
    title: "Page Not Found — Pluggd",
    description: "The page you were looking for could not be found on Pluggd.",
    path: location.pathname,
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
      <main className="text-center space-y-4">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-lg text-muted-foreground">Oops! Page not found</p>
        <nav aria-label="Quick links" className="flex items-center justify-center gap-4 text-sm">
          <Link to="/" className="text-primary hover:underline">Home</Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/terms" className="text-primary hover:underline">Terms</Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/privacy" className="text-primary hover:underline">Privacy</Link>
        </nav>
      </main>
    </div>

  );
};

export default NotFound;
