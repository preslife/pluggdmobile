import React from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';

const TestPage = () => {
  usePageMetadata({
    title: 'Internal Test Page — Pluggd',
    description: 'Sandbox route used for testing layouts and components within Pluggd.',
    path: '/test',
  });

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Page</h1>
        <p className="text-muted-foreground">
          This is a test page for development purposes.
        </p>
      </div>
    </div>
  );
};

export default TestPage;