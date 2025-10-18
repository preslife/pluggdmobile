import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import ContractsHistory from '@/components/ContractsHistory';
import { usePageMetadata } from '@/hooks/usePageMetadata';

const Contracts = () => {
  usePageMetadata({
    title: 'Contract Management — Pluggd',
    description: 'Track licensing agreements, access contract history, and review deliverables for your beat deals.',
    path: '/contracts',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Contract Management</h1>
            <p className="text-muted-foreground">
              View and manage your beat licensing contracts
            </p>
          </div>
          
          <ContractsHistory />
        </div>
      </div>
    </div>
  );
};

export default Contracts;