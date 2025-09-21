import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReceiptViewerProps {
  purchaseId: string;
  receiptUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ReceiptViewer = ({ purchaseId, receiptUrl, className, children }: ReceiptViewerProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(receiptUrl);
  const { toast } = useToast();

  const generateReceipt = async () => {
    if (pdfUrl) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: {
          payment_id: purchaseId,
          type: 'purchase'
        }
      });

      if (error) throw error;
      
      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className={className}>
            <FileText className="w-4 h-4 mr-2" />
            View Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase Receipt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {pdfUrl ? (
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                Your receipt is ready for download
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={downloadReceipt}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                Generate a PDF receipt for this purchase
              </div>
              <Button onClick={generateReceipt} disabled={loading}>
                <FileText className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Receipt'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};