import { useEffect } from 'react';

export const FullBrandConsistency = () => {
  useEffect(() => {
    // Apply comprehensive brand consistency across all components
    const applyBrandConsistency = () => {
      // Update all buttons to use proper brand colors
      const buttons = document.querySelectorAll('button:not([data-brand-updated])');
      buttons.forEach(button => {
        button.setAttribute('data-brand-updated', 'true');
        
        // Primary buttons
        if (button.classList.contains('bg-primary')) {
          button.classList.add('bg-gradient-primary', 'hover:shadow-glow', 'transition-all', 'duration-300');
        }
        
        // Outline buttons
        if (button.classList.contains('border-border')) {
          button.classList.remove('border-border');
          button.classList.add('border-primary/30', 'hover:border-primary', 'hover:bg-primary/10');
        }
        
        // Ghost buttons
        if (button.classList.contains('hover:bg-accent')) {
          button.classList.remove('hover:bg-accent');
          button.classList.add('hover:bg-primary/10');
        }
      });

      // Update all cards
      const cards = document.querySelectorAll('[class*="bg-card"]:not([data-brand-updated])');
      cards.forEach(card => {
        card.setAttribute('data-brand-updated', 'true');
        card.classList.add('bg-card/50', 'backdrop-blur-sm', 'border-primary/10', 'shadow-card');
      });

      // Update all inputs
      const inputs = document.querySelectorAll('input:not([data-brand-updated]), textarea:not([data-brand-updated])');
      inputs.forEach(input => {
        input.setAttribute('data-brand-updated', 'true');
        input.classList.add(
          'bg-card/30',
          'border-primary/20',
          'focus:border-primary',
          'focus:ring-primary/20',
          'focus:ring-2',
          'transition-all',
          'duration-200'
        );
      });

      // Update all badges
      const badges = document.querySelectorAll('[class*="bg-secondary"]:not([data-brand-updated])');
      badges.forEach(badge => {
        badge.setAttribute('data-brand-updated', 'true');
        badge.classList.add('bg-primary/10', 'text-primary', 'border-primary/20');
      });

      // Update all navigation links
      const navLinks = document.querySelectorAll('nav a:not([data-brand-updated])');
      navLinks.forEach(link => {
        link.setAttribute('data-brand-updated', 'true');
        link.classList.add(
          'hover:text-primary',
          'transition-colors',
          'duration-200',
          'relative',
          'hover:after:content-[""]',
          'hover:after:absolute',
          'hover:after:bottom-0',
          'hover:after:left-0',
          'hover:after:w-full',
          'hover:after:h-0.5',
          'hover:after:bg-gradient-primary'
        );
      });

      // Add geometric pattern overlays to hero sections
      const heroSections = document.querySelectorAll('[class*="hero"]:not([data-brand-updated])');
      heroSections.forEach(hero => {
        hero.setAttribute('data-brand-updated', 'true');
        
        // Add geometric overlay
        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 opacity-10 pointer-events-none';
        overlay.style.backgroundImage = `
          radial-gradient(circle at 20% 20%, var(--primary) 1px, transparent 1px),
          radial-gradient(circle at 80% 80%, var(--primary) 1px, transparent 1px),
          linear-gradient(45deg, transparent 49%, var(--primary) 49%, var(--primary) 51%, transparent 51%)
        `;
        overlay.style.backgroundSize = '100px 100px, 100px 100px, 20px 20px';
        (hero as HTMLElement).style.position = 'relative';
        hero.appendChild(overlay);
      });

      // Apply glow effects to important elements
      const importantElements = document.querySelectorAll('.text-primary:not([data-brand-updated])');
      importantElements.forEach(element => {
        element.setAttribute('data-brand-updated', 'true');
        element.classList.add('drop-shadow-glow');
      });

      // Update progress bars
      const progressBars = document.querySelectorAll('[class*="progress"]:not([data-brand-updated])');
      progressBars.forEach(progress => {
        progress.setAttribute('data-brand-updated', 'true');
        progress.classList.add('bg-gradient-primary');
      });

      // Update tab triggers
      const tabTriggers = document.querySelectorAll('[data-state="active"]:not([data-brand-updated])');
      tabTriggers.forEach(tab => {
        tab.setAttribute('data-brand-updated', 'true');
        tab.classList.add('bg-gradient-primary', 'shadow-glow');
      });

      // Apply brand colors to SVG icons
      const svgIcons = document.querySelectorAll('svg:not([data-brand-updated])');
      svgIcons.forEach(svg => {
        svg.setAttribute('data-brand-updated', 'true');
        if (svg.parentElement?.classList.contains('text-primary')) {
          (svg as SVGElement).style.filter = 'drop-shadow(0 0 8px hsl(var(--primary)))';
        }
      });
    };

    // Initial application
    applyBrandConsistency();

    // Re-apply when DOM changes (for dynamic content)
    const observer = new MutationObserver(() => {
      requestAnimationFrame(applyBrandConsistency);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return null;
};