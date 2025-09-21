import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import JSZip from 'jszip';
import { supabase } from "@/integrations/supabase/client";

interface ParsedCourse {
  title: string;
  description: string;
  modules: {
    title: string;
    lessons: {
      title: string;
      content: string;
      type: 'text' | 'video' | 'quiz';
      duration: number;
    }[];
  }[];
}

export const CourseZipUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedCourse, setParsedCourse] = useState<ParsedCourse | null>(null);

  const parseFileName = (fileName: string) => {
    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.(md|html)$/i, '');
    
    // Extract module and lesson numbers
    const moduleMatch = nameWithoutExt.match(/module[_\s-]*(\d+)/i);
    const lessonMatch = nameWithoutExt.match(/lesson[_\s-]*(\d+)/i);
    
    // Extract title (everything after module/lesson indicators)
    let title = nameWithoutExt;
    if (moduleMatch || lessonMatch) {
      const lastMatch = moduleMatch && lessonMatch ? 
        (moduleMatch.index! > lessonMatch.index! ? moduleMatch : lessonMatch) :
        (moduleMatch || lessonMatch);
      title = nameWithoutExt.substring(lastMatch!.index! + lastMatch![0].length).replace(/^[_\s-]+/, '');
    }
    
    return {
      moduleNumber: moduleMatch ? parseInt(moduleMatch[1]) : 1,
      lessonNumber: lessonMatch ? parseInt(lessonMatch[1]) : 1,
      title: title || `Lesson ${lessonMatch?.[1] || '1'}`
    };
  };

  const extractTitleFromContent = (content: string, fileName: string): string => {
    // Try to extract title from markdown heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1];
    
    // Try to extract from HTML title tag
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) return titleMatch[1];
    
    // Try to extract from HTML h1 tag
    const h1HtmlMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1HtmlMatch) return h1HtmlMatch[1];
    
    // Fallback to parsed filename
    return parseFileName(fileName).title;
  };

  const estimateDuration = (content: string): number => {
    // Rough estimate: 200 words per minute reading speed
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.round(wordCount / 200));
  };

  const parseZipFile = async (file: File): Promise<ParsedCourse> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    const files: { path: string; content: string; moduleNumber: number; lessonNumber: number; title: string }[] = [];
    
    // Extract all markdown and HTML files
    for (const [path, zipFile] of Object.entries(zipContent.files)) {
      if (!zipFile.dir && /\.(md|html)$/i.test(path)) {
        const content = await zipFile.async('text');
        const parsed = parseFileName(path);
        const title = extractTitleFromContent(content, path);
        
        files.push({
          path,
          content,
          moduleNumber: parsed.moduleNumber,
          lessonNumber: parsed.lessonNumber,
          title
        });
      }
    }
    
    if (files.length === 0) {
      throw new Error('No markdown or HTML files found in the zip');
    }
    
    // Sort files by module and lesson number
    files.sort((a, b) => {
      if (a.moduleNumber !== b.moduleNumber) {
        return a.moduleNumber - b.moduleNumber;
      }
      return a.lessonNumber - b.lessonNumber;
    });
    
    // Group into modules
    const moduleMap = new Map<number, typeof files>();
    files.forEach(file => {
      if (!moduleMap.has(file.moduleNumber)) {
        moduleMap.set(file.moduleNumber, []);
      }
      moduleMap.get(file.moduleNumber)!.push(file);
    });
    
    // Determine course title (use first file's title or zip name)
    const courseTitle = files[0]?.title || file.name.replace(/\.zip$/i, '');
    
    const modules = Array.from(moduleMap.entries()).map(([moduleNumber, moduleFiles]) => ({
      title: `Module ${moduleNumber}`,
      lessons: moduleFiles.map(file => ({
        title: file.title,
        content: file.content,
        type: 'text' as const,
        duration: estimateDuration(file.content)
      }))
    }));
    
    return {
      title: courseTitle,
      description: `Course imported from ${file.name}`,
      modules
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Please upload a ZIP file');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const course = await parseZipFile(file);
      setParsedCourse(course);
      toast.success('Course structure parsed successfully!');
    } catch (error) {
      console.error('Error parsing zip file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse zip file');
    } finally {
      setIsUploading(false);
    }
  };

  const createCourse = async () => {
    if (!parsedCourse) return;
    
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create courses');
        return;
      }
      
      // Convert to the format expected by the courses table
      const courseContent = parsedCourse.modules.map((module, moduleIndex) => ({
        id: `module-${moduleIndex + 1}`,
        title: module.title,
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          id: `lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content,
          duration: lesson.duration
        }))
      }));
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: parsedCourse.title,
          description: parsedCourse.description,
          content: courseContent,
          instructor_id: user.id,
          is_published: false,
          duration_hours: parsedCourse.modules.reduce((total, module) => 
            total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.duration, 0), 0
          ) / 60 // Convert minutes to hours
        })
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Course creation failed');
      
      toast.success('Course created successfully!');
      setParsedCourse(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Course from ZIP
          </CardTitle>
          <CardDescription>
            Upload a ZIP file containing markdown (.md) or HTML files organized by modules and lessons.
            Files should be named like "Module 1 Lesson 1 - Introduction.md" for proper organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="zip-upload"
              />
              <label
                htmlFor="zip-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Choose ZIP file</p>
                  <p className="text-sm text-muted-foreground">
                    Or drag and drop your course ZIP file here
                  </p>
                </div>
              </label>
            </div>
            
            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Parsing course structure...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Course Structure Preview
            </CardTitle>
            <CardDescription>
              Review the parsed course structure before creating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{parsedCourse.title}</h3>
                <p className="text-sm text-muted-foreground">{parsedCourse.description}</p>
              </div>
              
              <div className="space-y-3">
                {parsedCourse.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border rounded-lg p-4">
                    <h4 className="font-medium text-base mb-2">{module.title}</h4>
                    <div className="space-y-2">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{lesson.title}</span>
                          <span className="text-muted-foreground">({lesson.duration} min)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {parsedCourse.modules.length} modules, {' '}
                  {parsedCourse.modules.reduce((total, module) => total + module.lessons.length, 0)} lessons
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setParsedCourse(null)}>
                    Cancel
                  </Button>
                  <Button onClick={createCourse} disabled={isUploading}>
                    {isUploading ? 'Creating...' : 'Create Course'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};