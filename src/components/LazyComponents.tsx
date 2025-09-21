import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

// Lazy load components for better performance
const PerformanceMonitor = lazy(() => import('./PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })));
const FeedbackSystem = lazy(() => import('./FeedbackSystem').then(m => ({ default: m.FeedbackSystem })));
const SecurityDashboard = lazy(() => import('./SecurityDashboard').then(m => ({ default: m.SecurityDashboard })));
const UniversalSearch = lazy(() => import('./UniversalSearch').then(m => ({ default: m.UniversalSearch })));
const SocialFeed = lazy(() => import('./SocialFeed').then(m => ({ default: m.SocialFeed })));
const PaymentQA = lazy(() => import('./PaymentQA').then(m => ({ default: m.PaymentQA })));
const PaymentValidation = lazy(() => import('./PaymentValidation').then(m => ({ default: m.PaymentValidation })));

// Loading fallback component
const LoadingFallback = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    </CardContent>
  </Card>
);

// Memoized wrapper components for performance
export const LazyPerformanceMonitor = () => (
  <Suspense fallback={<LoadingFallback />}>
    <PerformanceMonitor />
  </Suspense>
);

export const LazyFeedbackSystem = () => (
  <Suspense fallback={<LoadingFallback />}>
    <FeedbackSystem />
  </Suspense>
);

export const LazySecurityDashboard = () => (
  <Suspense fallback={<LoadingFallback />}>
    <SecurityDashboard />
  </Suspense>
);

export const LazyUniversalSearch = () => (
  <Suspense fallback={<LoadingFallback />}>
    <UniversalSearch />
  </Suspense>
);

export const LazySocialFeed = () => (
  <Suspense fallback={<LoadingFallback />}>
    <SocialFeed />
  </Suspense>
);

export const LazyPaymentQA = () => (
  <Suspense fallback={<LoadingFallback />}>
    <PaymentQA />
  </Suspense>
);

export const LazyPaymentValidation = () => (
  <Suspense fallback={<LoadingFallback />}>
    <PaymentValidation />
  </Suspense>
);