import React from 'react';
import { useNavigate } from 'react-router-dom';
import BeatUploadForm from '@/components/BeatUploadForm';
import { usePageMetadata } from '@/hooks/usePageMetadata';

export default function BeatCreatePage() {
  usePageMetadata({
    title: 'Upload a Beat — Pluggd',
    description: 'Publish new instrumentals to your Pluggd catalog with licensing, previews, and metadata tools.',
    path: '/beats/new',
  });

  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <BeatUploadForm
          onSuccess={() => navigate('/studio/catalog?tab=beats')}
          onCancel={() => navigate('/studio/catalog?tab=beats')}
        />
      </div>
    </div>
  );
}

