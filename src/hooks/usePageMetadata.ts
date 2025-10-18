import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

type MetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
};

export const usePageMetadata = ({ title, description, path, image }: MetadataOptions) => {
  useEffect(() => {
    if (!title) return;
    setMeta(title, description, path, image);
  }, [title, description, path, image]);
};
