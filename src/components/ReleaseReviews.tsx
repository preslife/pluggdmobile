import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Star, MessageSquare, ThumbsUp, Flag } from 'lucide-react';

type Review = {
  id: string;
  user_id: string;
  release_id: string;
  rating: number;
  comment: string;
  created_at: string;
  helpful_count: number;
  user_profile?: {
    full_name: string;
    avatar_url: string;
  };
};

type ReleaseReviewsProps = {
  releaseId: string;
  releaseTitle: string;
  allowReviews?: boolean;
};

const ReleaseReviews = ({ releaseId, releaseTitle, allowReviews = true }: ReleaseReviewsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    fetchReviews();
  }, [releaseId]);

  const fetchReviews = async () => {
    try {
      // Mock data for demo
      const mockReviews: Review[] = [
        {
          id: '1',
          user_id: 'user1',
          release_id: releaseId,
          rating: 5,
          comment: 'Amazing track! Really love the production quality.',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          helpful_count: 12,
          user_profile: {
            full_name: 'Music Lover',
            avatar_url: ''
          }
        },
        {
          id: '2',
          user_id: 'user2',
          release_id: releaseId,
          rating: 4,
          comment: 'Great beat, could use some work on the mixing.',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          helpful_count: 8,
          user_profile: {
            full_name: 'Producer Pro',
            avatar_url: ''
          }
        }
      ];

      setReviews(mockReviews);
      
      // Calculate stats
      const total = mockReviews.length;
      const average = total > 0 ? mockReviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
      
      setTotalReviews(total);
      setAverageRating(average);
      
      // Calculate rating distribution
      const distribution = [0, 0, 0, 0, 0];
      mockReviews.forEach(review => {
        distribution[review.rating - 1]++;
      });
      setRatingDistribution(distribution);
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user || userRating === 0) return;

    setSubmitting(true);
    try {
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback (demo mode)."
      });

      setUserRating(0);
      setUserComment('');
      setShowReviewForm(false);
      fetchReviews();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      toast({
        title: "Marked as helpful",
        description: "Thank you for your feedback!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as helpful.",
        variant: "destructive"
      });
    }
  };

  const reportReview = async (reviewId: string) => {
    try {
      toast({
        title: "Review Reported",
        description: "Thank you for helping keep our community safe."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to report review.",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Reviews for {releaseTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-sm text-muted-foreground">{totalReviews} reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: totalReviews > 0 ? `${(ratingDistribution[rating - 1] / totalReviews) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">
                    {ratingDistribution[rating - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Write Review Button */}
          {user && allowReviews && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => setShowReviewForm(!showReviewForm)}
                variant="outline"
                className="w-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {showReviewForm && user && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Write Your Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Rating</label>
              <div className="flex gap-1">
                {renderStars(userRating, true, setUserRating)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Your Review</label>
              <Textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Share your thoughts about this release..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submitReview}
                disabled={submitting || userRating === 0}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="bg-gradient-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.user_profile?.avatar_url} />
                  <AvatarFallback>
                    {review.user_profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{review.user_profile?.full_name}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reportReview(review.id)}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm">{review.comment}</p>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markHelpful(review.id)}
                      className="text-xs"
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful ({review.helpful_count})
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reviews.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
          <p className="text-muted-foreground">
            Be the first to share your thoughts about this release.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReleaseReviews;