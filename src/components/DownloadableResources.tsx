import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Archive, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

interface Course {
  id: string;
  title: string;
  description: string;
  content: any;
  thumbnail_url?: string;
}

interface DownloadableResourcesProps {
  course: Course;
  userProgress?: any;
}

export const DownloadableResources: React.FC<DownloadableResourcesProps> = ({
  course,
  userProgress
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateCoursePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF();
      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;

      // Title
      pdf.setFontSize(20);
      pdf.text(course.title, margin, yPosition);
      yPosition += 15;

      // Description
      pdf.setFontSize(12);
      const descriptionLines = pdf.splitTextToSize(course.description, 170);
      pdf.text(descriptionLines, margin, yPosition);
      yPosition += descriptionLines.length * 5 + 10;

      // Course content
      const lessons = Array.isArray(course.content) ? course.content : course.content?.lessons || [];
      
      lessons.forEach((lesson: any, index: number) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        // Lesson title
        pdf.setFontSize(14);
        pdf.text(`${index + 1}. ${lesson.title}`, margin, yPosition);
        yPosition += 10;

        // Lesson content
        pdf.setFontSize(10);
        if (lesson.content) {
          const contentLines = pdf.splitTextToSize(lesson.content, 170);
          pdf.text(contentLines, margin, yPosition);
          yPosition += contentLines.length * 4 + 15;
        }
      });

      // Footer
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 10);
        pdf.text(`Generated from ${course.title}`, margin + 100, pageHeight - 10);
      }

      pdf.save(`${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_course_materials.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "Course materials PDF has been downloaded",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCourseZip = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();
      const lessons = Array.isArray(course.content) ? course.content : course.content?.lessons || [];

      // Add course info
      const courseInfo = {
        title: course.title,
        description: course.description,
        total_lessons: lessons.length,
        generated_at: new Date().toISOString()
      };
      zip.file('course_info.json', JSON.stringify(courseInfo, null, 2));

      // Add README
      const readme = `# ${course.title}

${course.description}

## Course Contents
Total Lessons: ${lessons.length}

${lessons.map((lesson: any, index: number) => 
  `${index + 1}. ${lesson.title} (${lesson.type})`
).join('\n')}

Generated on: ${new Date().toLocaleDateString()}
`;
      zip.file('README.md', readme);

      // Add lesson files
      const lessonsFolder = zip.folder('lessons');
      lessons.forEach((lesson: any, index: number) => {
        const filename = `${String(index + 1).padStart(2, '0')}_${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        
        if (lesson.type === 'quiz') {
          lessonsFolder?.file(`${filename}.json`, JSON.stringify(lesson, null, 2));
        } else {
          lessonsFolder?.file(`${filename}.md`, `# ${lesson.title}\n\n${lesson.content || ''}`);
        }
      });

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_course_materials.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "ZIP Generated",
        description: "Course materials ZIP has been downloaded",
      });
    } catch (error) {
      console.error('Error generating ZIP:', error);
      toast({
        title: "Error",
        description: "Failed to generate ZIP file",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const lessons = Array.isArray(course.content) ? course.content : course.content?.lessons || [];
  const completedLessons = userProgress?.completedLessons || [];
  const progressPercentage = lessons.length > 0 ? (completedLessons.length / lessons.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Downloadable Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PDF Download */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">Course PDF</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete course materials in PDF format with all lessons and content
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{lessons.length} Lessons</Badge>
                  <Badge variant="outline">{Math.round(progressPercentage)}% Complete</Badge>
                </div>
                <Button 
                  onClick={generateCoursePDF}
                  disabled={isGenerating}
                  size="sm"
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </Card>

          {/* ZIP Download */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Archive className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">Course Archive</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete course package with all materials, structured for offline use
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">ZIP Format</Badge>
                  <Badge variant="outline">Structured Files</Badge>
                </div>
                <Button 
                  onClick={generateCourseZip}
                  disabled={isGenerating}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Download ZIP'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Course Thumbnail */}
        {course.thumbnail_url && (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Image className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">Course Thumbnail</h4>
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full max-w-md rounded-lg border"
                />
                <Button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = course.thumbnail_url!;
                    a.download = `${course.title}_thumbnail.jpg`;
                    a.click();
                  }}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground">
          Resources include course content, lesson materials, and supplementary files for offline study.
        </div>
      </CardContent>
    </Card>
  );
};