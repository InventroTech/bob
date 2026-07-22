import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CseAnalyticsConfigProps {
  localConfig: {
    title?: string;
    showDatePicker?: boolean;
    analyticsType?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const CseAnalyticsConfig: React.FC<CseAnalyticsConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Board Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Analytics Board"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="analyticsType">Analytics Type</Label>
          <Input
            id="analyticsType"
            value={localConfig.analyticsType || ""}
            onChange={(e) => handleInputChange("analyticsType", e.target.value)}
            placeholder="cse"
          />
          <p className="text-xs text-muted-foreground">
            Which analytics this board saves under (e.g. cse, rm). Defaults to cse.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showDatePicker">Show Date Picker</Label>
          <Switch
            id="showDatePicker"
            checked={localConfig.showDatePicker !== false}
            onCheckedChange={(checked) => handleInputChange("showDatePicker", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
