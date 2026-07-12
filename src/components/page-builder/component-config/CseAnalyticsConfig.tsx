import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CseAnalyticsConfigProps {
  localConfig: {
    title?: string;
    showDatePicker?: boolean;
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
        <CardTitle>CSE Analytics Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="CSE Analytics"
          />
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
