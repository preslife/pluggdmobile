import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const mailingListSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type MailingListFormData = z.infer<typeof mailingListSchema>;

export const MailingListForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<MailingListFormData>({
    resolver: zodResolver(mailingListSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: MailingListFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('mailing_list')
        .insert({
          email: data.email,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already Subscribed",
            description: "This email is already on our mailing list!",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Subscribed!",
          description: "Thanks for joining our mailing list!",
        });
        form.reset();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-8 rounded-lg">
      <h3 className="text-2xl font-bold mb-4 text-center">Stay Updated</h3>
      <p className="text-zinc-400 text-center mb-6">
        Subscribe to our mailing list for the latest releases and news.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input 
                    {...field} 
                    type="email"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="your@email.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-gold text-black hover:bg-gold/90 font-medium px-6"
          >
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>
      </Form>
    </div>
  );
};