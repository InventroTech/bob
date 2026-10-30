import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MakeFreshConfigProps {
  localConfig: {
    title?: string;
    description?: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export function MakeFreshConfig({ localConfig, handleInputChange }: MakeFreshConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="make-fresh-title">Title</Label>
        <Input
          id="make-fresh-title"
          value={localConfig.title || ""}
          onChange={(event) => handleInputChange("title", event.target.value)}
          placeholder="Make leads fresh"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="make-fresh-description">Description</Label>
        <Textarea
          id="make-fresh-description"
          value={localConfig.description || ""}
          onChange={(event) => handleInputChange("description", event.target.value)}
          placeholder="Shown under the title on the page"
        />
      </div>
    </div>
  );
}
