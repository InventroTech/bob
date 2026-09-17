import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RmPrdAnalyticsConfigProps {
  localConfig: {
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const RmPrdAnalyticsConfig: React.FC<RmPrdAnalyticsConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RM PRD Analytics Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Optional heading shown above the dashboard"
          />
        </div>
      </CardContent>
    </Card>
  );
};
