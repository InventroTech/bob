import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MakeClosedConfigProps {
  localConfig: {
    title?: string;
    description?: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export function MakeClosedConfig({ localConfig, handleInputChange }: MakeClosedConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="make-closed-title">Title</Label>
        <Input
          id="make-closed-title"
          value={localConfig.title || ""}
          onChange={(event) => handleInputChange("title", event.target.value)}
          placeholder="Close leads"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="make-closed-description">Description</Label>
        <Textarea
          id="make-closed-description"
          value={localConfig.description || ""}
          onChange={(event) => handleInputChange("description", event.target.value)}
          placeholder="Shown under the title on the page"
        />
      </div>
    </div>
  );
}
