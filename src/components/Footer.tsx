import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-16 pb-16 md:pb-0 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {year} Pluggd. All rights reserved.
          </p>
          <nav aria-label="Links" className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/live" className="hover:text-primary transition-smooth font-medium">
              Go to Live
            </Link>
            <Link to="/subscription" className="hover:text-primary transition-smooth">
              Subscription
            </Link>
            <Link to="/terms" className="hover:text-primary transition-smooth">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-smooth">
              Privacy
            </Link>
            <Link to="/refunds" className="hover:text-primary transition-smooth">
              Refunds
            </Link>
            <Link to="/partners" className="hover:text-primary transition-smooth">
              Partners
            </Link>
            <Link to="/docs" className="hover:text-primary transition-smooth">
              API Docs
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
