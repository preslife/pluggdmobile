import React, { createContext, useContext, useEffect, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValue } from 'framer-motion';

interface ScrollAnimationContextType {
  scrollY: any;
  scrollYProgress: any;
  isScrollingUp: boolean;
  isScrollingDown: boolean;
}

const ScrollAnimationContext = createContext<ScrollAnimationContextType | null>(null);

export const useScrollContext = () => {
  const context = useContext(ScrollAnimationContext);
  if (!context) {
    throw new Error('useScrollContext must be used within ScrollAnimationProvider');
  }
  return context;
};

interface ScrollAnimationProviderProps {
  children: React.ReactNode;
}

export const ScrollAnimationProvider: React.FC<ScrollAnimationProviderProps> = ({ children }) => {
  const { scrollY, scrollYProgress } = useScroll();
  const lastScrollY = useRef(0);
  const isScrollingUp = useRef(false);
  const isScrollingDown = useRef(false);

  // Smooth scroll spring animation
  const smoothScrollY = useSpring(scrollY, {
    damping: 50,
    stiffness: 400,
    restDelta: 0.5,
  });

  useEffect(() => {
    const unsubscribe = scrollY.onChange((current) => {
      const previous = lastScrollY.current;
      isScrollingUp.current = current < previous;
      isScrollingDown.current = current > previous;
      lastScrollY.current = current;
    });

    return unsubscribe;
  }, [scrollY]);

  const contextValue = {
    scrollY: smoothScrollY,
    scrollYProgress,
    isScrollingUp: isScrollingUp.current,
    isScrollingDown: isScrollingDown.current,
  };

  return (
    <ScrollAnimationContext.Provider value={contextValue}>
      {children}
    </ScrollAnimationContext.Provider>
  );
};

// Animated section wrapper with scroll animations
interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  duration?: number;
  once?: boolean;
  threshold?: number;
  parallax?: boolean;
  parallaxSpeed?: number;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.8,
  once = true,
  threshold = 0.1,
  parallax = false,
  parallaxSpeed = 0.5,
}) => {
  const { scrollYProgress } = useScrollContext();
  const ref = useRef<HTMLDivElement>(null);

  // Define animation variants
  const variants = {
    hidden: {
      opacity: 0,
      ...(direction === 'up' && { y: 60 }),
      ...(direction === 'down' && { y: -60 }),
      ...(direction === 'left' && { x: -60 }),
      ...(direction === 'right' && { x: 60 }),
      ...(direction === 'scale' && { scale: 0.8 }),
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  // Parallax transform
  const y = useTransform(scrollYProgress, [0, 1], [0, parallax ? -100 * parallaxSpeed : 0]);

  return (
    <motion.div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{ y: parallax ? y : undefined }}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ 
        once, 
        amount: threshold,
        margin: "-10% 0px -10% 0px" 
      }}
    >
      {children}
    </motion.div>
  );
};

// Parallax wrapper component
interface ParallaxWrapperProps {
  children: React.ReactNode;
  speed?: number;
  direction?: 'up' | 'down';
  className?: string;
}

export const ParallaxWrapper: React.FC<ParallaxWrapperProps> = ({
  children,
  speed = 0.5,
  direction = 'up',
  className = '',
}) => {
  const { scrollYProgress } = useScrollContext();
  
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    direction === 'up' ? [0, -100 * speed] : [0, 100 * speed]
  );

  return (
    <motion.div
      className={`parallax-element ${className}`}
      style={{ y }}
    >
      {children}
    </motion.div>
  );
};

// Sticky reveal component
interface StickyRevealProps {
  children: React.ReactNode;
  className?: string;
  triggerPoint?: number;
}

export const StickyReveal: React.FC<StickyRevealProps> = ({
  children,
  className = '',
  triggerPoint = 0.3,
}) => {
  const { scrollYProgress } = useScrollContext();
  
  const scale = useTransform(scrollYProgress, [0, triggerPoint, 1], [0.8, 1, 1]);
  const opacity = useTransform(scrollYProgress, [0, triggerPoint], [0, 1]);

  return (
    <motion.div
      className={`sticky-header ${className}`}
      style={{
        scale,
        opacity,
      }}
    >
      {children}
    </motion.div>
  );
};

// Stagger children animation
interface StaggeredAnimationProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  childVariants?: any;
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  childVariants,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: staggerDelay,
      },
    },
  };

  const defaultChildVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={childVariants || defaultChildVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};