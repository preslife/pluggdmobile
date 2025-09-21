import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SimpleWishlistButtonProps {
  productId: string;
  productTitle: string;
  className?: string;
}

export const SimpleWishlistButton: React.FC<SimpleWishlistButtonProps> = ({
  productId,
  productTitle,
  className = ""
}) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkWishlistStatus();
    }
  }, [user, productId]);

  const checkWishlistStatus = () => {
    if (!user) return;
    
    // Check localStorage for wishlist items
    const wishlist = JSON.parse(localStorage.getItem(`wishlist_${user.id}`) || '[]');
    setIsInWishlist(wishlist.some((item: any) => item.productId === productId));
  };

  const toggleWishlist = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your wishlist",
        variant: "destructive",
      });
      return;
    }

    const wishlistKey = `wishlist_${user.id}`;
    const wishlist = JSON.parse(localStorage.getItem(wishlistKey) || '[]');

    if (isInWishlist) {
      const newWishlist = wishlist.filter((item: any) => item.productId !== productId);
      localStorage.setItem(wishlistKey, JSON.stringify(newWishlist));
      setIsInWishlist(false);
      toast({
        title: "Removed from wishlist",
        description: `${productTitle} has been removed from your wishlist`,
      });
    } else {
      const newWishlist = [...wishlist, {
        productId,
        productTitle,
        addedAt: new Date().toISOString()
      }];
      localStorage.setItem(wishlistKey, JSON.stringify(newWishlist));
      setIsInWishlist(true);
      toast({
        title: "Added to wishlist",
        description: `${productTitle} has been added to your wishlist`,
      });
    }
  };

  return (
    <Button
      variant={isInWishlist ? "default" : "outline"}
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        toggleWishlist();
      }}
      className={className}
    >
      <Heart className={`w-4 h-4 mr-2 ${isInWishlist ? 'fill-current' : ''}`} />
      {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
    </Button>
  );
};