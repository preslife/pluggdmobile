import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";

export const useSplitsParams = () => {
  const [searchParams] = useSearchParams();
  
  const selectedContent = useMemo(() => {
    const content = searchParams.get('content');
    const type = searchParams.get('type');
    const title = searchParams.get('title');
    
    if (content && type && title) {
      return {
        id: content,
        type,
        title: decodeURIComponent(title)
      };
    }
    
    return null;
  }, [searchParams]);
  
  return { selectedContent };
};