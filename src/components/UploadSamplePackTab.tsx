import { EnhancedSamplePackUploader } from "@/components/EnhancedSamplePackUploader";
import { useNavigate } from "react-router-dom";

export const UploadSamplePackTab = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <EnhancedSamplePackUploader 
        onSuccess={() => {
          navigate('/sample-pack-store');
        }}
      />
    </div>
  );
};