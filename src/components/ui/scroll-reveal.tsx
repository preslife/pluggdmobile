import React, { useRef, useEffect, ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale-up';
  delay?: number;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  animation = 'fade-in',
  delay = 0,
  once = true,
  threshold = 0.1,
  rootMargin = '0px 0px -10% 0px',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useScrollAnimation(
    ref,
    'animate',
    {
      threshold,
      rootMargin,
      once,
      delay,
    }
  );

  const animationClass = `scroll-${animation}`;

  return (
    <div
      ref={ref}
      className={cn(animationClass, className)}
    >
      {children}
    </div>
  );
};

// Pre-configured animation variants for common use cases
export const FadeInSection: React.FC<Omit<ScrollRevealProps, 'animation'>> = (props) => (
  <ScrollReveal {...props} animation="fade-in" />
);

export const SlideUpSection: React.FC<Omit<ScrollRevealProps, 'animation'>> = (props) => (
  <ScrollReveal {...props} animation="slide-up" />
);

export const SlideLeftSection: React.FC<Omit<ScrollRevealProps, 'animation'>> = (props) => (
  <ScrollReveal {...props} animation="slide-left" />
);

export const SlideRightSection: React.FC<Omit<ScrollRevealProps, 'animation'>> = (props) => (
  <ScrollReveal {...props} animation="slide-right" />
);

export const ScaleUpSection: React.FC<Omit<ScrollRevealProps, 'animation'>> = (props) => (
  <ScrollReveal {...props} animation="scale-up" />
);

// Staggered children animation component
interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  childAnimation?: 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale-up';
  containerThreshold?: number;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  className = '',
  staggerDelay = 100,
  childAnimation = 'fade-in',
  containerThreshold = 0.1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const childRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            childRefs.current.forEach((child, index) => {
              if (child) {
                setTimeout(() => {
                  child.classList.add('animate');
                }, index * staggerDelay);
              }
            });
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: containerThreshold,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [staggerDelay, containerThreshold]);

  const animationClass = `scroll-${childAnimation}`;

  return (
    <div ref={containerRef} className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          ref={(el) => {
            childRefs.current[index] = el;
          }}
          className={animationClass}
        >
          {child}
        </div>
      ))}
    </div>
  );
};