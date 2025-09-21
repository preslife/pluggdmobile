import EnhancedProducerDashboard from '@/components/EnhancedProducerDashboard';


const Producer = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <EnhancedProducerDashboard />
      </div>
    </div>
  );
};

export default Producer;