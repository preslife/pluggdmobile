import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/usePageMetadata";


type BetaFormData = {
  name: string;
  email: string;
  role: string;
  experience: string;
  interests: string;
};

const BetaProgram = () => {
  usePageMetadata({
    title: "Pluggd Beta Program",
    description: "Apply to test upcoming Pluggd creator tools, AI features, and collaborative studio workflows before they launch.",
    path: "/beta-program",
  });

  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const form = useForm<BetaFormData>();

  const onSubmit = async (data: BetaFormData) => {
    // Simulate form submission
    console.log('Beta program application:', data);
    
    toast({
      title: "Application Submitted!",
      description: "We'll review your application and get back to you within 48 hours.",
    });
    
    setIsSubmitted(true);
    form.reset();
  };

  const betaFeatures = [
    {
      title: "AI Stem Separation",
      description: "Isolate vocals, drums, bass, and other instruments from any track",
      status: "Testing Phase",
      icon: "🎯"
    },
    {
      title: "Real-time Collaboration",
      description: "Work on projects simultaneously with other artists in real-time",
      status: "Alpha Testing",
      icon: "🤝"
    },
    {
      title: "Advanced Analytics",
      description: "Deep insights into your music performance across all platforms",
      status: "Beta Testing",
      icon: "📊"
    },
    {
      title: "Smart Contract Manager",
      description: "Automated royalty splits and contract management",
      status: "Development",
      icon: "📜"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-accent/20 text-accent border-accent/30">
            🚀 Early Access Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Beta Program</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get early access to cutting-edge features and help shape the future of music collaboration. 
            Join our exclusive beta community and unlock premium tools before anyone else.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Beta Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">What You'll Get Access To</h2>
            
            {betaFeatures.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-gradient-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {feature.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}

            {/* Benefits */}
            <Card className="bg-gradient-accent/10 border-accent/30">
              <CardHeader>
                <CardTitle className="text-xl">Beta Member Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-sm">Priority access to all new features</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-sm">Direct feedback channel with our development team</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-sm">Exclusive beta-only features and tools</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-sm">50% discount on premium features when they launch</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl">Apply for Beta Access</CardTitle>
                <CardDescription>
                  Tell us about yourself and why you'd be a great beta tester
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isSubmitted ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        rules={{ required: 'Name is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        rules={{ 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="role"
                        rules={{ required: 'Role is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Role in Music</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Producer, Artist, Songwriter" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="experience"
                        rules={{ required: 'Experience is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 5 years" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="interests"
                        rules={{ required: 'Please tell us about your interests' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What features interest you most?</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell us which beta features you're most excited about and how you plan to use them..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" variant="premium">
                        Submit Application
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold mb-2">Application Submitted!</h3>
                    <p className="text-muted-foreground mb-6">
                      Thank you for your interest in our beta program. We'll review your application 
                      and get back to you within 48 hours with next steps.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSubmitted(false)}
                    >
                      Submit Another Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaProgram;