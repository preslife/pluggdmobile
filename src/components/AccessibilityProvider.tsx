import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface AccessibilityContextType {
  skipToMain: () => void;
  announceLiveRegion: (message: string) => void;
  focusManagement: {
    setReturnFocus: (element: HTMLElement | null) => void;
    returnFocus: () => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface Props {
  children: React.ReactNode;
}

export const AccessibilityProvider = ({ children }: Props) => {
  const [returnFocusElement, setReturnFocusElement] = useState<HTMLElement | null>(null);

  const skipToMain = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const announceLiveRegion = (message: string) => {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after a delay
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  const setReturnFocus = (element: HTMLElement | null) => {
    setReturnFocusElement(element);
  };

  const returnFocus = () => {
    if (returnFocusElement) {
      returnFocusElement.focus();
      setReturnFocusElement(null);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip to main content with Alt+S
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        skipToMain();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const contextValue: AccessibilityContextType = {
    skipToMain,
    announceLiveRegion,
    focusManagement: {
      setReturnFocus,
      returnFocus,
    },
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip to main content link */}
      <Button
        variant="ghost"
        size="sm"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-background border"
        onClick={skipToMain}
      >
        Skip to main content (Alt+S)
      </Button>
      
      {/* Live region for announcements */}
      <div
        id="live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};