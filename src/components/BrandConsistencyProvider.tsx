import React, { useEffect } from 'react';

// This component ensures consistent brand application across the app
const BrandConsistencyProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Apply global brand styles that may not be caught by Tailwind
    const applyBrandStyles = () => {
      // Ensure all buttons follow brand guidelines
      const buttons = document.querySelectorAll('button:not([data-brand-applied])');
      buttons.forEach(button => {
        button.setAttribute('data-brand-applied', 'true');
        
        // Apply consistent hover effects for primary buttons
        if (button.classList.contains('bg-primary')) {
          button.classList.add('hover:shadow-glow', 'transition-all', 'duration-300');
        }
        
        // Apply consistent outline styles
        if (button.classList.contains('border')) {
          button.classList.add('border-border');
        }
      });

      // Ensure all cards have consistent styling
      const cards = document.querySelectorAll('[class*="bg-card"]:not([data-brand-applied])');
      cards.forEach(card => {
        card.setAttribute('data-brand-applied', 'true');
        card.classList.add('shadow-card', 'border-border');
      });

      // Apply consistent input styles
      const inputs = document.querySelectorAll('input:not([data-brand-applied]), textarea:not([data-brand-applied])');
      inputs.forEach(input => {
        input.setAttribute('data-brand-applied', 'true');
        input.classList.add('bg-background', 'border-border', 'focus:border-primary', 'focus:ring-primary/20');
      });
    };

    // Apply on mount
    applyBrandStyles();

    // Apply when DOM changes (for dynamic content)
    const observer = new MutationObserver(applyBrandStyles);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

export default BrandConsistencyProvider;