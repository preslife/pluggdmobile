import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Upload } from 'lucide-react';
import BeatUploadForm from './BeatUploadForm';

export const BeatUploadTab = () => {
  const [showUploadForm, setShowUploadForm] = useState(false);

  if (showUploadForm) {
    return (
      <BeatUploadForm 
        onSuccess={() => setShowUploadForm(false)}
        onCancel={() => setShowUploadForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Upload Beat
          </CardTitle>
          <CardDescription>
            Share your beats with the community and start earning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowUploadForm(true)} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Upload New Beat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};