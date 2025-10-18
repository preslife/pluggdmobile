import EnhancedProducerDashboard from '@/components/EnhancedProducerDashboard';
import { usePageMetadata } from '@/hooks/usePageMetadata';

const Producer = () => {
  usePageMetadata({
    title: 'Producer Hub — Pluggd',
    description: 'Centralize your production workflow with analytics, catalog management, and monetization tools on Pluggd.',
    path: '/producer',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <EnhancedProducerDashboard />
      </div>
    </div>
  );
};

export default Producer;