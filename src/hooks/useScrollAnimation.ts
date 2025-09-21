import { useEffect, useCallback, useRef } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  triggerOnce?: boolean;
  delay?: number;
}

export const useScrollAnimation = (
  elementRef: React.RefObject<HTMLElement>,
  className: string = 'animate',
  options: ScrollAnimationOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -10% 0px',
    once = true,
    delay = 0
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        
        if (delay > 0) {
          setTimeout(() => {
            element.classList.add(className);
          }, delay);
        } else {
          element.classList.add(className);
        }

        if (once && observerRef.current) {
          observerRef.current.unobserve(entry.target);
        }
      } else if (!once) {
        (entry.target as HTMLElement).classList.remove(className);
      }
    });
  }, [className, once, delay]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, handleIntersection, threshold, rootMargin]);

  return observerRef.current;
};

// Multiple elements animation hook
export const useScrollAnimations = (
  selector: string,
  className: string = 'animate',
  options: ScrollAnimationOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -10% 0px',
    once = true,
    delay = 0
  } = options;

  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const elementDelay = delay + (index * 100); // Stagger animations
          
          setTimeout(() => {
            element.classList.add(className);
          }, elementDelay);

          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          (entry.target as HTMLElement).classList.remove(className);
        }
      });
    }, {
      threshold,
      rootMargin
    });

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [selector, className, threshold, rootMargin, once, delay]);
};

// Parallax effect hook
export const useParallax = (
  elementRef: React.RefObject<HTMLElement>,
  speed: number = 0.5,
  direction: 'vertical' | 'horizontal' = 'vertical'
) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -speed;
      
      if (direction === 'vertical') {
        element.style.transform = `translateY(${rate}px)`;
      } else {
        element.style.transform = `translateX(${rate}px)`;
      }
    };

    // Add performance optimization
    let ticking = false;
    const updateParallax = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', updateParallax, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updateParallax);
    };
  }, [elementRef, speed, direction]);
};

// Sticky header with scroll direction detection
export const useStickyHeader = (
  headerRef: React.RefObject<HTMLElement>,
  threshold: number = 100
) => {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateHeader = () => {
      const scrollY = window.pageYOffset;
      
      if (scrollY > threshold) {
        header.classList.add('scrolled');
        
        if (scrollY > lastScrollY && scrollY > threshold * 2) {
          // Scrolling down
          header.classList.add('hidden');
        } else {
          // Scrolling up
          header.classList.remove('hidden');
        }
      } else {
        header.classList.remove('scrolled', 'hidden');
      }

      lastScrollY = scrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [headerRef, threshold]);
};