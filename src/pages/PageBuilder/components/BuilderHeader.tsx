
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, Save } from "lucide-react";

interface BuilderHeaderProps {
  pageName: string;
  setPageName: (name: string) => void;
  onSave: () => void;
  onPreview: () => void;
}

const BuilderHeader: React.FC<BuilderHeaderProps> = ({ 
  pageName, 
  setPageName, 
  onSave, 
  onPreview 
}) => {
  return (
    <header className="border-b px-6 py-3 bg-background z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="h-9 w-[300px] font-medium"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    </header>
  );
};

export default BuilderHeader;
