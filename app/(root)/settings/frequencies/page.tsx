"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface FrequencyOption {
  id: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
}

const defaultFrequencies: FrequencyOption[] = [
  {
    id: "daily",
    name: "Daily",
    code: "D",
    description: "Day over day comparison and daily tracking",
    enabled: true,
  },
  {
    id: "weekly",
    name: "Weekly",
    code: "W",
    description: "Week over week comparison and weekly analysis",
    enabled: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    code: "MoM",
    description: "Month over month comparison and monthly trends",
    enabled: true,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    code: "QoQ",
    description: "Quarter over quarter comparison and quarterly performance",
    enabled: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    code: "YoY",
    description: "Year over year comparison and annual analysis",
    enabled: true,
  },
];

export default function FrequenciesPage() {
  const [frequencies, setFrequencies] =
    useState<FrequencyOption[]>(defaultFrequencies);

  const handleToggleFrequency = (id: string) => {
    setFrequencies(
      frequencies.map((freq) =>
        freq.id === id ? { ...freq, enabled: !freq.enabled } : freq,
      ),
    );
  };

  const handleSave = () => {
    // Implement your save logic here
    toast({
      title: "Success",
      description: "Frequency settings saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Frequency Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage default frequency options for reports and analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Available Frequencies
          </CardTitle>
          <CardDescription>
            Configure which frequency options should be available throughout the
            application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {frequencies.map((frequency) => (
            <div
              key={frequency.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">
                    {frequency.name}
                  </Label>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                    {frequency.code}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {frequency.description}
                </p>
              </div>
              <Switch
                checked={frequency.enabled}
                onCheckedChange={() => handleToggleFrequency(frequency.id)}
              />
            </div>
          ))}

          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Enabled frequencies will be available as options in reports,
                analysis, and other time-based features
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
