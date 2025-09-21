import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const MobileSwipeGestures = ({ children }: { children: React.ReactNode }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Handle left swipe (could navigate forward)
      console.log('Left swipe detected');
    }
    if (isRightSwipe) {
      // Handle right swipe (could navigate back)
      console.log('Right swipe detected');
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="touch-pan-y"
    >
      {children}
    </div>
  );
};

export const MobileOptimizedCards = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <Card className={cn("touch-manipulation", className)}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
};

export const MobilePullToRefresh = ({ onRefresh, children }: { onRefresh: () => void; children: React.ReactNode }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStart;
    
    if (distance > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {isPulling && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center text-sm text-muted-foreground z-10"
          style={{ transform: `translateY(${pullDistance - 60}px)` }}
        >
          {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
      <div style={{ transform: `translateY(${isPulling ? pullDistance * 0.5 : 0}px)` }}>
        {children}
      </div>
    </div>
  );
};