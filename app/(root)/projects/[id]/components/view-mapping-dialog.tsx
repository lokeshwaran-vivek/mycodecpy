import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Loader2, Pencil, Save, X } from "lucide-react";
import { ProjectTemplateWithTemplate } from "@/lib/types";
import { useState, useEffect } from "react";
import { TemplateFile } from "@prisma/client";
import { TemplateField, TemplateFieldType } from "@/types/template-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processUploadedFile, updateTemplateMappings } from "../actions";
import { toast } from "@/hooks/use-toast";
import { log } from "@/lib/utils/log";

interface ViewMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: TemplateFile;
  template: ProjectTemplateWithTemplate;
}

// Utility function to capitalize the first letter of each word
function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ViewMappingDialog({
  open,
  onOpenChange,
  file,
  template,
}: ViewMappingDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [mappings, setMappings] = useState<Record<string, string>>(
    (template.fieldMappings as Record<string, string>) || {}
  );
  const fileHeaders = Object.keys(
    (template.fieldMappings as Record<string, string>) || {}
  );

  const [reverseMapping, setReverseMapping] = useState<Record<string, string>>(
    Object.entries(mappings).reduce(
      (acc, [fileHeader, templateField]) => ({
        ...acc,
        [capitalizeWords(templateField)]: capitalizeWords(fileHeader),
      }),
      {} as Record<string, string>
    )
  );

  useEffect(() => {
    // Update reverseMapping whenever mappings change
    setReverseMapping(
      Object.entries(mappings).reduce(
        (acc, [fileHeader, templateField]) => ({
          ...acc,
          [capitalizeWords(templateField)]: capitalizeWords(fileHeader),
        }),
        {} as Record<string, string>
      )
    );
  }, [mappings]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const filteredHeaders = fileHeaders.filter((header) =>
        Object.values(mappings).includes(header)
      );

      const convertedFields = (
        template.template.fields as unknown as Array<{
          name: string;
          type: TemplateFieldType;
          required: boolean;
          description?: string;
        }>
      ).map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
      }));

      const contentResponse = await processUploadedFile(
        template.projectId,
        file.name,
        filteredHeaders,
        convertedFields,
        mappings,
        template.id
      );

      // Update template with new mappings
      await updateTemplateMappings(
        template.projectId,
        template.id,
        file.id,
        file
      );

      if (!contentResponse.status) {
        throw new Error(contentResponse.message);
      }
      toast({
        title: "Success",
        description: "Mappings updated successfully",
      });
    } catch (error) {
      log({
        message: "Error updating mappings",
        type: "error",
        data: error,
      });
      toast({
        title: "Error",
        description: "Failed to update mappings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Field Mappings
            </DialogTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Mappings
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <DialogDescription>
              Current field mappings for {file.name}
            </DialogDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono border rounded-md px-2.5 py-0.5 text-xs bg-background">
                {template.template.name}
              </span>
              <span>•</span>
              <span>
                Uploaded on {new Date(file.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] rounded-md border">
          <div className="p-4">
            <div className="space-y-6">
              {/* Template Fields */}
              <div>
                <h4 className="text-sm font-medium mb-3">Template Fields</h4>
                <div className="space-y-2">
                  {(template.template.fields as unknown as TemplateField[]).map(
                    (field) => (
                      <div
                        key={field.name}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{field.name}</p>
                            <Badge
                              variant={field.required ? "default" : "secondary"}
                            >
                              {field.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                          {field.description && (
                            <p className="text-sm text-muted-foreground">
                              {field.description}
                            </p>
                          )}
                        </div>
                        {isEditing ? (
                          <Select
                            value={
                              reverseMapping[capitalizeWords(field.name)] ||
                              "__NOT_MAPPED__"
                            }
                            onValueChange={(value) => {
                              const newMappings = { ...mappings };
                              // Remove old mapping if it exists
                              Object.entries(newMappings).forEach(
                                ([header, fieldName]) => {
                                  if (fieldName === field.name) {
                                    delete newMappings[header];
                                  }
                                }
                              );
                              // Add new mapping if not the special "not mapped" value
                              if (value !== "__NOT_MAPPED__") {
                                newMappings[capitalizeWords(value)] =
                                  capitalizeWords(field.name);
                              }
                              setMappings(newMappings);
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select a header" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NOT_MAPPED__">
                                Not Mapped
                              </SelectItem>
                              {fileHeaders.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="font-mono">
                            {reverseMapping[field.name] || "Not Mapped"}
                          </Badge>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Unmapped File Headers */}
              {template.fieldMappings && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Unmapped File Headers
                  </h4>
                  <div className="space-y-2">
                    {fileHeaders
                      .filter(
                        (header) =>
                          !Object.values(reverseMapping).includes(header)
                      )
                      .map((header) => (
                        <div
                          key={header}
                          className="flex items-center justify-between p-2 rounded-lg border border-dashed"
                        >
                          <p className="font-mono text-sm text-muted-foreground">
                            {header}
                          </p>
                          <Badge variant="outline">Not Used</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
