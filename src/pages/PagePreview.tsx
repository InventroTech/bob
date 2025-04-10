
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface PreviewComponent {
  id: string;
  type: string;
  label: string;
  content: string;
  properties?: Record<string, any>;
}

interface PagePreviewData {
  title: string;
  components: PreviewComponent[];
}

const PagePreview = () => {
  const [previewData, setPreviewData] = useState<PagePreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get preview data from localStorage
    try {
      const storedData = localStorage.getItem("pagePreview");
      if (storedData) {
        setPreviewData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error("Error loading preview data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/builder/new">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Link>
          </Button>
        </div>
        
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <h1 className="text-2xl font-bold text-muted-foreground">No Preview Data Available</h1>
          <p className="text-muted-foreground mt-2">Return to the page builder and save your page to preview it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/builder/new">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Link>
        </Button>
      </div>
      
      <div className="bg-white dark:bg-background rounded-lg border shadow-sm">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold">{previewData.title}</h1>
        </div>
        
        <div className="p-6 space-y-4">
          {previewData.components.map((component) => (
            <div 
              key={component.id}
              dangerouslySetInnerHTML={{ __html: component.content }}
            />
          ))}
          
          {previewData.components.length === 0 && (
            <p className="text-muted-foreground text-center py-8">This page has no content</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PagePreview;
