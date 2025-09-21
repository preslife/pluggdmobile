import { useState } from "react";
import { setMeta } from "@/lib/seo";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileText, Music, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportResult {
  row: number;
  id?: string;
  type: string;
  title?: string;
  preview?: any;
  valid?: boolean;
  error?: string;
}

const CreatorImport = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("beats");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setMeta(
      "Bulk Import — Pluggd",
      "Import your beats, releases, and sample packs in bulk using CSV files.",
      "/dashboard/creator/import"
    );
  }, []);

  const downloadTemplate = (type: string) => {
    let csvContent = "";
    
    if (type === "beats") {
      csvContent = "title,bpm,key,price,tags,genre\nSample Beat,140,C minor,9.99,trap hip-hop,Hip Hop\n";
    } else if (type === "releases") {
      csvContent = "title,artist,genre,type,release_date,price\nSample Release,Artist Name,Hip Hop,single,2024-01-15,4.99\n";
    } else if (type === "packs") {
      csvContent = "title,description,price,category\nSample Pack,High quality trap samples,19.99,Hip Hop\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!csvFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      formData.append('type', activeTab);
      formData.append('dryRun', 'true');
      if (zipFile) formData.append('zip', zipFile);

      const { data, error } = await supabase.functions.invoke('bulk-import', {
        body: formData
      });

      if (error) throw error;

      setResults(data.results || []);
      setErrors(data.errors || []);
      setShowPreview(true);
      
      toast({
        title: "Preview Generated",
        description: `Found ${data.results?.length || 0} valid rows, ${data.errors?.length || 0} errors`,
      });
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setImporting(false);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      formData.append('type', activeTab);
      formData.append('dryRun', 'false');
      if (zipFile) formData.append('zip', zipFile);

      const { data, error } = await supabase.functions.invoke('bulk-import', {
        body: formData
      });

      if (error) throw error;

      setResults(data.results || []);
      setErrors(data.errors || []);
      
      toast({
        title: "Import Completed",
        description: `Imported ${data.results?.length || 0} items successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setImporting(false);
  };

  const resetForm = () => {
    setCsvFile(null);
    setZipFile(null);
    setResults([]);
    setErrors([]);
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Bulk Import</h1>
            <p className="text-muted-foreground">
              Import your beats, releases, and sample packs in bulk using CSV files
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="beats" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Beats
              </TabsTrigger>
              <TabsTrigger value="releases" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Releases
              </TabsTrigger>
              <TabsTrigger value="packs" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Sample Packs
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file to import multiple {activeTab} at once. Download the template to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate(activeTab)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="csv-upload">CSV File *</Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="zip-upload">ZIP File (Optional)</Label>
                      <Input
                        id="zip-upload"
                        type="file"
                        accept=".zip"
                        onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload audio files and artwork in a ZIP file
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handlePreview}
                      disabled={!csvFile || importing}
                      variant="outline"
                    >
                      {importing ? "Processing..." : "Preview"}
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={!csvFile || importing}
                    >
                      {importing ? "Importing..." : "Import"}
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="ghost"
                      disabled={importing}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {(results.length > 0 || errors.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Import Results</CardTitle>
                    <CardDescription>
                      {showPreview ? "Preview" : "Import"} completed with {results.length} successful items and {errors.length} errors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <strong>Errors found in {errors.length} rows:</strong>
                          <ul className="mt-2 space-y-1">
                            {errors.slice(0, 5).map((error, i) => (
                              <li key={i}>Row {error.row}: {error.error}</li>
                            ))}
                            {errors.length > 5 && (
                              <li>... and {errors.length - 5} more errors</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {results.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Successful Items:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {results.map((result, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span>Row {result.row}: {result.title || result.preview?.title}</span>
                              {result.id && <span className="text-sm text-muted-foreground">ID: {result.id}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CreatorImport;