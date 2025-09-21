import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Edit, Trash2, Plus, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoursePricingManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface CoursePricing {
  id: string;
  course_id: string;
  is_pro_only: boolean;
  one_time_price: number | null;
}

export const CoursePricingManager = ({ isOpen, onClose }: CoursePricingManagerProps) => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursePricing, setCoursePricing] = useState<CoursePricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      fetchCoursePricing();
    }
  }, [isOpen]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive"
      });
    }
  };

  const fetchCoursePricing = async () => {
    try {
      const { data, error } = await supabase
        .from('course_pricing')
        .select('*');

      if (error) throw error;
      setCoursePricing(data || []);
    } catch (error) {
      console.error('Error fetching course pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCoursePricing = async (courseId: string, isProOnly: boolean, oneTimePrice: number | null) => {
    try {
      const { error } = await supabase
        .from('course_pricing')
        .upsert({
          course_id: courseId,
          is_pro_only: isProOnly,
          one_time_price: oneTimePrice
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course pricing updated successfully"
      });

      fetchCoursePricing();
    } catch (error) {
      console.error('Error updating course pricing:', error);
      toast({
        title: "Error",
        description: "Failed to update course pricing",
        variant: "destructive"
      });
    }
  };

  const getCoursePricing = (courseId: string) => {
    return coursePricing.find(cp => cp.course_id === courseId) || {
      is_pro_only: false,
      one_time_price: null
    };
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            Course Pricing Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Pro-Only Course Settings</h3>
            <p className="text-sm text-muted-foreground">
              Mark courses as Pro-only and set optional one-time purchase prices for individual course access.
            </p>
          </div>

          <div className="space-y-4">
            {courses.map((course) => {
              const pricing = getCoursePricing(course.id);
              
              return (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{course.title}</span>
                      {pricing.is_pro_only && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Crown className="h-3 w-3 mr-1" />
                          Pro Only
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{course.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`pro-${course.id}`}>Pro-Only Course</Label>
                          <Switch
                            id={`pro-${course.id}`}
                            checked={pricing.is_pro_only}
                            onCheckedChange={(checked) => 
                              updateCoursePricing(course.id, checked, pricing.one_time_price)
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Only Pro subscribers can access this course
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor={`price-${course.id}`}>One-Time Purchase Price (£)</Label>
                        <Input
                          id={`price-${course.id}`}
                          type="number"
                          step="0.01"
                          placeholder="19.99"
                          value={pricing.one_time_price || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : null;
                            updateCoursePricing(course.id, pricing.is_pro_only, value);
                          }}
                          disabled={!pricing.is_pro_only}
                        />
                        <p className="text-xs text-muted-foreground">
                          Allow non-Pro users to purchase individual access
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};