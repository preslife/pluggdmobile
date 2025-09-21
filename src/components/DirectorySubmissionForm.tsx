import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DirectorySubmissionData = {
  title: string;
  bio: string;
  location: string;
  experience: string;
  hourly_rate: string;
  website_url: string;
};

interface DirectorySubmissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const genres = [
  'Hip Hop', 'Trap', 'R&B', 'Pop', 'Electronic', 'Rock', 'Jazz', 'Classical', 'Country', 'Reggae',
  'Dancehall', 'Afrobeats', 'Drill', 'UK Drill', 'Grime', 'Soca', 'Bashment', 'Amapiano'
];

const DirectorySubmissionForm = ({ onSuccess, onCancel }: DirectorySubmissionFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [creditInput, setCreditInput] = useState('');
  const [credits, setCredits] = useState<string[]>([]);

  const form = useForm<DirectorySubmissionData>({
    defaultValues: {
      title: '',
      bio: '',
      location: '',
      experience: '',
      hourly_rate: '',
      website_url: ''
    }
  });

  const addGenre = (genre: string) => {
    if (genre && !selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setSelectedGenres(selectedGenres.filter(genre => genre !== genreToRemove));
  };

  const addCredit = () => {
    if (creditInput.trim() && !credits.includes(creditInput.trim())) {
      setCredits([...credits, creditInput.trim()]);
      setCreditInput('');
    }
  };

  const removeCredit = (creditToRemove: string) => {
    setCredits(credits.filter(credit => credit !== creditToRemove));
  };

  const onSubmit = async (data: DirectorySubmissionData) => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('directory_submissions')
        .insert([{
          user_id: user.id,
          title: data.title,
          bio: data.bio,
          location: data.location,
          experience: data.experience,
          genres: selectedGenres,
          hourly_rate: data.hourly_rate,
          credits: credits,
          website_url: data.website_url,
          social_links: {}
        }]);

      if (error) throw error;

      toast({
        title: "Submission Sent!",
        description: "Your directory application has been submitted for review. You'll be notified once it's approved."
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Join the Directory
        </CardTitle>
        <CardDescription>
          Apply to be featured in our professional directory. All submissions are reviewed by our team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Review Process</span>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Applications are typically reviewed within 2-3 business days. You'll receive an email notification once your application is processed.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: 'Professional title is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hip-Hop Producer & Mix Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                rules={{ required: 'Location is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Atlanta, GA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              rules={{ required: 'Bio is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about your experience, achievements, and what makes you unique..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="experience"
                rules={{ required: 'Experience is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5+ years" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hourly_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., £150-300/hr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website/Portfolio (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourwebsite.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Genres */}
            <div className="space-y-3">
              <FormLabel>Genres (Select all that apply)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Button
                    key={genre}
                    type="button"
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    size="sm"
                    onClick={() => 
                      selectedGenres.includes(genre) 
                        ? removeGenre(genre) 
                        : addGenre(genre)
                    }
                  >
                    {genre}
                  </Button>
                ))}
              </div>
              {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.map((genre, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {genre}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeGenre(genre)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Credits */}
            <div className="space-y-3">
              <FormLabel>Notable Credits (Optional)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add artist/project you've worked with..."
                  value={creditInput}
                  onChange={(e) => setCreditInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCredit())}
                />
                <Button type="button" onClick={addCredit} variant="outline">
                  Add
                </Button>
              </div>
              {credits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {credits.map((credit, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {credit}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeCredit(credit)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DirectorySubmissionForm;