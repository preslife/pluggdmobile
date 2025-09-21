import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, Calendar, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface BookingFormProps {
  professional: {
    id?: string;
    user_id?: string;
    name?: string;
    title?: string;
    profiles?: {
      full_name?: string;
      username?: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  service_type: string;
  project_title: string;
  project_description: string;
  budget_range: string;
  deadline: string;
  preferred_contact: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  message: string;
}

export const BookingForm = ({ professional, isOpen, onClose }: BookingFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    service_type: "",
    project_title: "",
    project_description: "",
    budget_range: "",
    deadline: "",
    preferred_contact: "email",
    client_name: "",
    client_email: user?.email || "",
    client_phone: "",
    message: ""
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a professional",
        variant: "destructive"
      });
      return;
    }

    if (!formData.service_type || !formData.project_title || !formData.project_description || !formData.client_name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Insert booking into database
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          client_user_id: user.id,
          professional_user_id: professional.user_id || professional.id,
          service_type: formData.service_type,
          project_title: formData.project_title,
          project_description: formData.project_description,
          budget_range: formData.budget_range || null,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : null,
          preferred_contact: formData.preferred_contact,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone || null,
          message: formData.message || null
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Booking creation failed');

      // Send email notifications via edge function
      try {
        const response = await supabase.functions.invoke('send-booking-notification', {
          body: {
            booking: data,
            professional: professional,
            client: formData
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the booking if email fails
      }

      toast({
        title: "Booking Submitted!",
        description: "Your booking request has been sent to the professional and admin.",
      });

      onClose();
      
      // Reset form
      setFormData({
        service_type: "",
        project_title: "",
        project_description: "",
        budget_range: "",
        deadline: "",
        preferred_contact: "email",
        client_name: "",
        client_email: user?.email || "",
        client_phone: "",
        message: ""
      });

    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Error",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const professionalName = professional.name || 
                          professional.profiles?.full_name || 
                          professional.profiles?.username || 
                          "Professional";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Book {professionalName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {professional.title}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type *</Label>
                <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="mixing">Mixing</SelectItem>
                    <SelectItem value="mastering">Mastering</SelectItem>
                    <SelectItem value="vocals">Vocals</SelectItem>
                    <SelectItem value="songwriting">Songwriting</SelectItem>
                    <SelectItem value="instruments">Instruments</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="preferred_contact">Preferred Contact *</Label>
                <Select value={formData.preferred_contact} onValueChange={(value) => handleInputChange('preferred_contact', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="message">Platform Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="project_title">Project Title *</Label>
              <Input
                id="project_title"
                placeholder="e.g., Mix & Master my R&B album"
                value={formData.project_title}
                onChange={(e) => handleInputChange('project_title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="project_description">Project Description *</Label>
              <Textarea
                id="project_description"
                placeholder="Describe your project, timeline, and any specific requirements..."
                value={formData.project_description}
                onChange={(e) => handleInputChange('project_description', e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_range">Budget Range</Label>
                <Input
                  id="budget_range"
                  placeholder="e.g., £500-1000"
                  value={formData.budget_range}
                  onChange={(e) => handleInputChange('budget_range', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Your Name *</Label>
                <Input
                  id="client_name"
                  placeholder="Full name"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="client_email">Email *</Label>
                <Input
                  id="client_email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client_phone">Phone Number</Label>
              <Input
                id="client_phone"
                placeholder="(optional)"
                value={formData.client_phone}
                onChange={(e) => handleInputChange('client_phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="message">Additional Message</Label>
              <Textarea
                id="message"
                placeholder="Any additional information or questions..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};