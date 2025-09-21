import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Plus, Edit, Trash2, MoreHorizontal, DollarSign, Music, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type LicenseTemplate = {
  id: string;
  name: string;
  license_type: string;
  description: string;
  terms: string;
  price: number;
  file_types: string[];
  usage_rights: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type LicenseFormData = {
  name: string;
  license_type: string;
  description: string;
  terms: string;
  price: number;
  file_types: string[];
  usage_rights: {
    commercial_use: boolean;
    exclusive: boolean;
    radio_play: boolean;
    streaming: boolean;
    distribution_copies: number;
    modification_allowed: boolean;
  };
};

const licenseTypes = [
  'Basic', 'Premium', 'Trackout', 'Unlimited', 'Exclusive', 'Custom'
];

const fileTypes = [
  'MP3', 'WAV', 'STEMS', 'MIDI', 'TRACKOUTS'
];

const LicenseTemplateManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<LicenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LicenseTemplate | null>(null);

  const form = useForm<LicenseFormData>({
    defaultValues: {
      name: '',
      license_type: '',
      description: '',
      terms: '',
      price: 0,
      file_types: [],
      usage_rights: {
        commercial_use: false,
        exclusive: false,
        radio_play: false,
        streaming: false,
        distribution_copies: 1000,
        modification_allowed: false,
      }
    }
  });

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('license_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch license templates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LicenseFormData) => {
    if (!user) return;

    try {
      const templateData = {
        user_id: user.id,
        name: data.name,
        license_type: data.license_type,
        description: data.description,
        terms: data.terms,
        price: data.price,
        file_types: data.file_types,
        usage_rights: data.usage_rights,
        is_active: true
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('license_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "License template updated successfully."
        });
      } else {
        const { error } = await supabase
          .from('license_templates')
          .insert([templateData]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "License template created successfully."
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save license template.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (template: LicenseTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      license_type: template.license_type,
      description: template.description,
      terms: template.terms,
      price: template.price,
      file_types: template.file_types,
      usage_rights: template.usage_rights
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('license_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "License template deleted successfully."
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete license template.",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('license_templates')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast({
        title: "Error",
        description: "Failed to update template status.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading license templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            License Templates
          </h2>
          <p className="text-muted-foreground">
            Manage your licensing terms and pricing for beats
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              form.reset();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit License Template' : 'Create License Template'}
              </DialogTitle>
              <DialogDescription>
                Set up licensing terms and pricing for your beats
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Basic License" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="license_type"
                    rules={{ required: 'License type is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {licenseTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price"
                  rules={{ required: 'Price is required', min: { value: 0, message: 'Price must be positive' } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (GBP)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="29.99"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this license..."
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Terms</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed terms and conditions..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Types */}
                <div className="space-y-3">
                  <FormLabel>Included File Types</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {fileTypes.map((fileType) => (
                      <div key={fileType} className="flex items-center space-x-2">
                        <Checkbox
                          id={`file-${fileType}`}
                          checked={form.watch('file_types').includes(fileType)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('file_types');
                            if (checked) {
                              form.setValue('file_types', [...current, fileType]);
                            } else {
                              form.setValue('file_types', current.filter(t => t !== fileType));
                            }
                          }}
                        />
                        <label htmlFor={`file-${fileType}`} className="text-sm cursor-pointer">
                          {fileType}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Usage Rights */}
                <div className="space-y-3">
                  <FormLabel>Usage Rights</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="commercial-use"
                        checked={form.watch('usage_rights.commercial_use')}
                        onCheckedChange={(checked) => 
                          form.setValue('usage_rights.commercial_use', checked as boolean)
                        }
                      />
                      <label htmlFor="commercial-use" className="text-sm cursor-pointer">
                        Commercial Use
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exclusive"
                        checked={form.watch('usage_rights.exclusive')}
                        onCheckedChange={(checked) => 
                          form.setValue('usage_rights.exclusive', checked as boolean)
                        }
                      />
                      <label htmlFor="exclusive" className="text-sm cursor-pointer">
                        Exclusive Rights
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="radio-play"
                        checked={form.watch('usage_rights.radio_play')}
                        onCheckedChange={(checked) => 
                          form.setValue('usage_rights.radio_play', checked as boolean)
                        }
                      />
                      <label htmlFor="radio-play" className="text-sm cursor-pointer">
                        Radio Play
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="streaming"
                        checked={form.watch('usage_rights.streaming')}
                        onCheckedChange={(checked) => 
                          form.setValue('usage_rights.streaming', checked as boolean)
                        }
                      />
                      <label htmlFor="streaming" className="text-sm cursor-pointer">
                        Streaming Allowed
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="modification"
                        checked={form.watch('usage_rights.modification_allowed')}
                        onCheckedChange={(checked) => 
                          form.setValue('usage_rights.modification_allowed', checked as boolean)
                        }
                      />
                      <label htmlFor="modification" className="text-sm cursor-pointer">
                        Modification Allowed
                      </label>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="usage_rights.distribution_copies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Copies Limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="1000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your License Templates</CardTitle>
          <CardDescription>
            Manage and organize your licensing options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No license templates yet</p>
              <p className="text-sm text-muted-foreground">Create your first template to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>File Types</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.license_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {template.price.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.file_types.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleActive(template.id, template.is_active)}
                          >
                            {template.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete License Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(template.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseTemplateManager;