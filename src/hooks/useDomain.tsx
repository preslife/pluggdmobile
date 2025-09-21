import React, { createContext, useContext, useEffect, useState } from 'react';

type DomainContextType = {
  isLiveDomain: boolean;
  isHubDomain: boolean;
  isLocalhost: boolean;
  isLiveRoute: boolean;
  currentDomain: string;
  redirectToProperDomain: (path: string) => void;
};

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export const DomainProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLiveDomain, setIsLiveDomain] = useState(false);
  const [isHubDomain, setIsHubDomain] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isLiveRoute, setIsLiveRoute] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    const host = window.location.host.toLowerCase();
    const pathname = window.location.pathname;
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const isLiveRoutePath = pathname.startsWith('/live');
    
    // On production: check actual domains
    // On localhost: never treat as live domain, but track live routes
    const isLive = !isLocal && host.includes('pluggd.live');
    const isHub = !isLocal && (host.includes('pluggd.fm') || (!host.includes('pluggd.live')));
    
    setIsLiveDomain(isLive);
    setIsHubDomain(isHub);
    setIsLocalhost(isLocal);
    setIsLiveRoute(isLiveRoutePath);
    setCurrentDomain(host);
  }, []);

  const redirectToProperDomain = (path: string) => {
    const isLivePath = path.startsWith('/live');
    const currentHost = window.location.host.toLowerCase();
    
    // If on pluggd.fm but trying to access live path
    if (currentHost.includes('pluggd.fm') && isLivePath) {
      window.location.href = `https://pluggd.live${path}`;
      return;
    }
    
    // If on pluggd.live but trying to access hub path
    if (currentHost.includes('pluggd.live') && !isLivePath) {
      window.location.href = `https://pluggd.fm${path}`;
      return;
    }
  };

  return (
    <DomainContext.Provider value={{
      isLiveDomain,
      isHubDomain,
      isLocalhost,
      isLiveRoute,
      currentDomain,
      redirectToProperDomain
    }}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = () => {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  return context;
};