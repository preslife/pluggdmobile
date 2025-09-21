import { Link, useLocation } from "react-router-dom";

const LiveFooter = () => {
  const year = new Date().getFullYear();
  const location = useLocation();
  const redirectParam = encodeURIComponent(location.pathname + location.search);
  return (
    <footer className="border-t border-border mt-16 pb-16 md:pb-0 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {year} Pluggd Live</p>
          <nav aria-label="Live links" className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-smooth font-medium">
              Back to Hub
            </Link>
            <Link to="/live/sessions" className="hover:text-primary transition-smooth">Sessions</Link>
            <Link to="/live/battles" className="hover:text-primary transition-smooth">Battles</Link>
            <Link to={`/auth?redirect=${redirectParam}`} className="hover:text-primary transition-smooth">Join the Community</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default LiveFooter;
