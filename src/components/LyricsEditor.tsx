import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface LyricsEditorProps {
  songName: string;
  songStructure: string[];
  lyrics: string;
  onLyricsChange: (lyrics: string) => void;
}

const LyricsEditor = ({ songName, songStructure, lyrics, onLyricsChange }: LyricsEditorProps) => {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = (section: string) => {
    const sectionPattern = new RegExp(`\\[${section}\\]`, 'i');
    const lines = lyrics.split('\n');
    let lineNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (sectionPattern.test(lines[i])) {
        lineNumber = i;
        break;
      }
    }
    
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const lineHeight = 20; // Approximate line height
      const scrollTop = lineNumber * lineHeight;
      textarea.scrollTop = scrollTop;
      
      // Focus and select the section
      const beforeSection = lines.slice(0, lineNumber).join('\n');
      const sectionStart = beforeSection.length + (lineNumber > 0 ? 1 : 0);
      const sectionEnd = sectionStart + lines[lineNumber].length;
      
      textarea.focus();
      textarea.setSelectionRange(sectionStart, sectionEnd);
    }
    
    setActiveSection(section);
    toast({
      title: "Jumped to Section",
      description: `Now editing: ${section}`,
    });
  };

  const exportTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([lyrics], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${songName}-lyrics.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Lyrics Exported",
      description: "TXT file downloaded",
    });
  };

  const exportPdf = () => {
    try {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(songName, 20, 20);
      
      // Add lyrics with proper line breaks
      pdf.setFontSize(12);
      const lines = lyrics.split('\n');
      let yPosition = 40;
      
      lines.forEach((line) => {
        if (yPosition > 270) { // Start new page if needed
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });
      
      pdf.save(`${songName}-lyrics.pdf`);
      toast({
        title: "PDF Exported",
        description: "Lyrics exported as PDF successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            {songName}
          </div>
          <div className="flex gap-2">
            <Button onClick={exportTxt} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1" />
              TXT
            </Button>
            <Button onClick={exportPdf} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Song Structure</div>
          <div className="flex flex-wrap gap-2">
            {songStructure.map((section, index) => (
              <Badge 
                key={index}
                variant={activeSection === section ? "default" : "secondary"}
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => scrollToSection(section)}
              >
                {section}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={lyrics}
            onChange={(e) => onLyricsChange(e.target.value)}
            placeholder="Start writing your lyrics here..."
            className="min-h-[500px] font-mono text-sm resize-none"
            onFocus={() => setActiveSection(null)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LyricsEditor;