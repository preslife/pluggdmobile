import React from 'react';
import { useNavigate } from 'react-router-dom';
import BeatUploadForm from '@/components/BeatUploadForm';

export default function BeatCreatePage() {
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

