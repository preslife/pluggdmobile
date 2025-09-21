import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProductRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!id) return;

      try {
        // Check if this product ID corresponds to a release
        const { data: release } = await supabase
          .from('releases')
          .select('id')
          .eq('id', id)
          .maybeSingle();

        if (release) {
          // Redirect to release page
          navigate(`/release/${id}`, { replace: true });
        } else {
          // Check if it's a regular store product
          const { data: product } = await supabase
            .from('store_products')
            .select('id')
            .eq('id', id)
            .maybeSingle();

          if (product) {
            // Show regular product detail page
            navigate(`/store/product/${id}`, { replace: true });
          } else {
            // Product not found, redirect to store
            navigate('/store', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking product:', error);
        navigate('/store', { replace: true });
      }
    };

    checkAndRedirect();
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

export default ProductRedirect;