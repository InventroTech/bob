import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface UserHierarchyConfigProps {
  localConfig: {
    title?: string;
    showTable?: boolean;
    showDiagram?: boolean;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const UserHierarchyConfig: React.FC<UserHierarchyConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Hierarchy Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userHierarchy-title">Title</Label>
          <Input
            id="userHierarchy-title"
            value={localConfig.title ?? ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="User Hierarchy"
          />
          <p className="text-xs text-muted-foreground">
            Heading shown above the hierarchy section
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="showTable">Show reporting table</Label>
            <p className="text-xs text-muted-foreground">
              Show the table where users can assign managers
            </p>
          </div>
          <Switch
            id="showTable"
            checked={localConfig.showTable !== false}
            onCheckedChange={(checked) => handleInputChange("showTable", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="showDiagram">Show diagram</Label>
            <p className="text-xs text-muted-foreground">
              Show the tree visualization of reporting lines
            </p>
          </div>
          <Switch
            id="showDiagram"
            checked={localConfig.showDiagram !== false}
            onCheckedChange={(checked) => handleInputChange("showDiagram", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
