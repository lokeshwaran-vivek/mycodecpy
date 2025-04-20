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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Building2, Bell, Globe, Calendar } from "lucide-react";

interface GeneralSettings {
  companyName: string;
  companyEmail: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  currency: string;
  language: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  autoBackup: boolean;
  darkMode: boolean;
  frequencies: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    quarterly: boolean;
    yearly: boolean;
  };
}

const CURRENCIES = [
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>({
    companyName: "",
    companyEmail: "",
    gstNumber: "",
    panNumber: "",
    address: "",
    currency: "INR",
    language: "en",
    dateFormat: "DD/MM/YYYY",
    notifications: {
      email: true,
      sms: true,
      inApp: true,
    },
    autoBackup: true,
    darkMode: false,
    frequencies: {
      daily: true,
      weekly: true,
      monthly: true,
      quarterly: true,
      yearly: true,
    },
  });

  const handleSave = () => {
    // Implement your settings save logic here
    toast({
      title: "Success",
      description: "Settings saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your application settings
        </p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Your company details used across the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) =>
                  setSettings({ ...settings, companyName: e.target.value })
                }
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.companyEmail}
                onChange={(e) =>
                  setSettings({ ...settings, companyEmail: e.target.value })
                }
                placeholder="Enter company email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={settings.gstNumber}
                onChange={(e) =>
                  setSettings({ ...settings, gstNumber: e.target.value })
                }
                placeholder="Enter GST number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={settings.panNumber}
                onChange={(e) =>
                  setSettings({ ...settings, panNumber: e.target.value })
                }
                placeholder="Enter PAN number"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
                placeholder="Enter company address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localization
          </CardTitle>
          <CardDescription>
            Configure regional settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) =>
                  setSettings({ ...settings, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings({ ...settings, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) =>
                  setSettings({ ...settings, dateFormat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={settings.notifications.email}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      email: checked,
                    },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via SMS
                </p>
              </div>
              <Switch
                checked={settings.notifications.sms}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, sms: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications within the application
                </p>
              </div>
              <Switch
                checked={settings.notifications.inApp}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      inApp: checked,
                    },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>Configure system-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Automatic Backup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup your data daily
                </p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoBackup: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable dark mode for the application
                </p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, darkMode: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Default Frequencies
          </CardTitle>
          <CardDescription>
            Configure default frequency options for reports and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Daily (D)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable daily frequency option
                </p>
              </div>
              <Switch
                checked={settings.frequencies.daily}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    frequencies: { ...settings.frequencies, daily: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Weekly (W)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable weekly frequency option
                </p>
              </div>
              <Switch
                checked={settings.frequencies.weekly}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    frequencies: { ...settings.frequencies, weekly: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Monthly (MoM)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable month-over-month frequency option
                </p>
              </div>
              <Switch
                checked={settings.frequencies.monthly}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    frequencies: { ...settings.frequencies, monthly: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Quarterly (QoQ)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable quarter-over-quarter frequency option
                </p>
              </div>
              <Switch
                checked={settings.frequencies.quarterly}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    frequencies: {
                      ...settings.frequencies,
                      quarterly: checked,
                    },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Yearly (YoY)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable year-over-year frequency option
                </p>
              </div>
              <Switch
                checked={settings.frequencies.yearly}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    frequencies: { ...settings.frequencies, yearly: checked },
                  })
                }
              />
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
