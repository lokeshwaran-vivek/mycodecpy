import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, XCircle, Eye } from "lucide-react";
import { ViewMappingDialog } from "./view-mapping-dialog";
import { MappingDialog } from "./mapping-dialog";
import { TemplateFile, FileStatus } from "@prisma/client";
import {
  ProjectWithTemplates,
  ProjectTemplateWithTemplate,
  TemplateField as LibTemplateField,
} from "@/lib/types";
import { TemplateField } from "@/types/template-fields";
import {
  updateTemplateMappings,
  deleteTemplateFile,
  uploadFile,
  processUploadedFile,
} from "../actions";
import { toast } from "@/hooks/use-toast";
import { FileUploadProgressModal } from "./file-upload-progress-modal";
import { log } from "@/lib/utils/log";

interface FilesTabProps {
  project: ProjectWithTemplates;
}

// Debounce function to prevent multiple rapid uploads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

export function FilesTab({ project }: FilesTabProps) {
  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplateWithTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [currentFile, setCurrentFile] = useState<TemplateFile | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [fileInputKey, setFileInputKey] = useState<number>(0);

  const [uploadProgress, setUploadProgress] = useState<
    {
      name: string;
      progress: number;
      status: "uploading" | "success" | "error";
      error?: string;
      size?: number;
      message?: string;
    }[]
  >([]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleViewMapping = (templateId: string, file: TemplateFile) => {
    const template = project.templates?.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSelectedFile(file);
    }
  };

  // Optimize header fetching for large files
  const processFileHeaders = useCallback((headers: string[]) => {
    // If we have too many headers, don't set them all at once
    // This improves UI performance with large files
    if (headers.length > 100) {
      // Set a limited initial set to allow UI to render quickly
      const initialHeaders = headers.slice(0, 60);
      setFileHeaders(initialHeaders);

      // Process the rest in chunks to prevent UI freezing
      const chunks = [];
      const chunkSize = 60;
      for (let i = 60; i < headers.length; i += chunkSize) {
        chunks.push(headers.slice(i, i + chunkSize));
      }

      // Process each chunk with a small delay between
      let chunkIndex = 0;
      const processNextChunk = () => {
        if (chunkIndex < chunks.length) {
          const nextChunk = [
            ...initialHeaders,
            ...headers.slice(60, 60 + (chunkIndex + 1) * chunkSize),
          ];
          setFileHeaders(nextChunk);
          chunkIndex++;

          // Schedule next chunk with a small delay
          setTimeout(processNextChunk, 100);
        } else {
          // All chunks processed, set complete headers
          setFileHeaders(headers);
        }
      };

      // Start processing chunks after a small delay
      setTimeout(processNextChunk, 300);
    } else {
      // For smaller header sets, process normally
      setFileHeaders(headers);
    }
  }, []);

  // Create a debounced version of the file upload handler
  const handleFileUpload = useCallback(
    async (templateId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file size early
      const isLargeFile = file.size > 5 * 1024 * 1024; // 5MB threshold
      const manyColumns =
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls");

      // Check if template already has a file
      const template = project.templates?.find((t) => t.id === templateId);
      if (template?.files.length && template.files.length > 0) {
        toast({
          title: "File already exists",
          description:
            "Please remove the existing file before uploading a new one.",
          variant: "destructive",
        });
        e.target.value = ""; // Reset file input
        return;
      }

      setIsLoading(true);
      try {
        // Validate file type
        if (
          !file.name.toLowerCase().endsWith(".csv") &&
          !file.name.toLowerCase().endsWith(".xlsx") &&
          !file.name.toLowerCase().endsWith(".xls")
        ) {
          toast({
            title: "Invalid file type",
            description: "Please upload a CSV or Excel file",
            variant: "destructive",
          });
          e.target.value = "";
          return;
        }

        // Show initial upload progress
        setUploadProgress([
          {
            name: file.name,
            progress: 0,
            status: "uploading",
            size: file.size,
            message: isLargeFile
              ? "Starting upload (large file detected)..."
              : manyColumns
                ? "Starting upload (excel file with potential many columns)..."
                : "Starting upload...",
          },
        ]);

        // Start upload with a small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Update progress to show file is uploading
        setUploadProgress([
          {
            name: file.name,
            progress: 10,
            status: "uploading",
            size: file.size,
            message: "Uploading file to server...",
          },
        ]);

        // Perform the actual upload
        const result = await uploadFile(project.id, templateId, file);

        if (!result.status) {
          throw new Error(result.message);
        }

        // Update UI state after the upload but before processing file
        setUploadProgress([
          {
            name: file.name,
            progress: 70,
            status: "uploading",
            size: file.size,
            message:
              isLargeFile || (result.headers && result.headers.length > 60)
                ? `Processing ${result.headers?.length || "many"} file headers...`
                : "Processing file headers...",
          },
        ]);

        // Set minimal necessary data to show the mapping dialog
        setCurrentFile(result.data || null);

        // For performance, we'll use the optimized header processing function
        if (result.headers && result.headers.length > 0) {
          // Set a flag based on headers count for UI optimization
          const hasLargeHeaderSet = result.headers.length > 60;

          processFileHeaders(result.headers);

          // Process headers in chunks to improve UI responsiveness
          // Use a longer timeout to ensure UI is responsive
          setTimeout(
            () => {
              try {
                if (template) {
                  setMappings(
                    (template.fieldMappings as Record<string, string>) || {}
                  );
                }

                // Show success state before opening dialog
                setUploadProgress([
                  {
                    name: file.name,
                    progress: 100,
                    status: "success",
                    size: file.size,
                    message: hasLargeHeaderSet
                      ? `File processed with ${result.headers?.length} columns`
                      : "File processed successfully",
                  },
                ]);

                // Small delay before showing dialog to ensure UI is updated
                // Use a longer delay for very large header sets
                setTimeout(
                  () => {
                    setShowMappingDialog(true);
                  },
                  hasLargeHeaderSet ? 300 : 100
                );
              } catch (error) {
                console.error("Error processing headers:", error);
                setUploadProgress([
                  {
                    name: file.name,
                    progress: 100,
                    status: "error",
                    error: "Failed to process file headers",
                  },
                ]);
              }
            },
            isLargeFile || result.headers?.length > 60 ? 500 : 300
          ); // Longer timeout for large files
        } else {
          setFileHeaders([]);
          toast({
            title: "Warning",
            description:
              "No headers found in the file. Please check the file format.",
            variant: "destructive",
          });
          setUploadProgress([
            {
              name: file.name,
              progress: 100,
              status: "error",
              error: "No headers found in file",
            },
          ]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setUploadProgress([
          {
            name: file.name,
            progress: 100,
            status: "error",
            error: errorMessage,
          },
        ]);
        // Reset file input on error
        setFileInputKey((prev) => prev + 1);
      } finally {
        setIsLoading(false);
        // Don't clear upload progress here - let it be visible until dialog opens
      }
    },
    [project.id, project.templates, processFileHeaders]
  );

  // Create a debounced version of the file upload handler
  const debouncedFileUpload = useCallback(
    (templateId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const debouncedFn = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(templateId, e);
      }, 300);
      debouncedFn(e);
    },
    [handleFileUpload]
  );

  const handleSaveMapping = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const headers = fileHeaders;

      const filteredHeaders = headers
        .map(
          (header) =>
            Object.entries(mappings).find(
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ([key, value]) => value === header
            )?.[0]
        )
        .filter(Boolean);

      const template = project.templates?.find(
        (t) => t.id === currentFile.projectTemplateId
      );
      const libFields: LibTemplateField[] | undefined = template?.template
        .fields as unknown as LibTemplateField[];

      // Convert lib fields to the expected TemplateField type
      const convertedFields: TemplateField[] =
        libFields?.map((field) => ({
          name: field.name,
          description: field.description,
          required: field.required,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: field.type as any, // Cast to expected TemplateFieldType
        })) || [];

      // Show processing feedback
      setUploadProgress([
        {
          name: currentFile.name,
          progress: 50,
          status: "uploading",
          message: "Processing file content...",
        },
      ]);

      // Process in chunks with timeouts to keep UI responsive
      setTimeout(async () => {
        try {
          // Update progress to show we're processing
          setUploadProgress([
            {
              name: currentFile.name,
              progress: 75,
              status: "uploading",
              message: "Analyzing data...",
            },
          ]);

          const contentResponse = await processUploadedFile(
            project.id,
            currentFile.name,
            filteredHeaders,
            convertedFields,
            mappings,
            currentFile.projectTemplateId
          );

          if (!contentResponse.status) {
            throw new Error(contentResponse.message);
          }

          // Update progress to show we're saving mappings
          setUploadProgress([
            {
              name: currentFile.name,
              progress: 90,
              status: "uploading",
              message: "Saving mappings...",
            },
          ]);

          // Update template with new mappings
          const result = await updateTemplateMappings(
            project.id,
            currentFile.projectTemplateId,
            currentFile.id,
            currentFile
          );

          if (!result.status) {
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive",
            });
            throw new Error(result.message);
          }

          // Show success state
          setUploadProgress([
            {
              name: currentFile.name,
              progress: 100,
              status: "success",
              message: "File processed successfully",
            },
          ]);

          // Close dialog and clean up with a small delay
          setShowMappingDialog(false);

          // Clear state after a short delay to maintain UI responsiveness
          setTimeout(() => {
            setCurrentFile(null);
            setFileHeaders([]);
            setMappings({});
            setUploadProgress([]);
          }, 500);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          log({ message: "Error saving mapping", type: "error", data: error });
          toast({
            title: "Error",
            description:
              errorMessage || "Failed to process file. Please try again.",
            variant: "destructive",
          });
          setUploadProgress([
            {
              name: currentFile.name,
              progress: 100,
              status: "error",
              error: errorMessage,
            },
          ]);
          setIsLoading(false);
        }
      }, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log({ message: "Error saving mapping", type: "error", data: error });
      toast({
        title: "Error",
        description:
          errorMessage || "Failed to process file. Please try again.",
        variant: "destructive",
      });
      setUploadProgress([
        {
          name: currentFile.name,
          progress: 100,
          status: "error",
          error: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (templateId: string, fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setIsLoading(true);
    try {
      await deleteTemplateFile(project.id, templateId, fileId);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelMapping = () => {
    setShowMappingDialog(false);
    setCurrentFile(null);
    setFileHeaders([]);
    setMappings({});
    // Reset file input
    setFileInputKey((prev) => prev + 1);
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {project.templates
          ?.sort((a, b) => a.template.name.localeCompare(b.template.name))
          .map((template: ProjectTemplateWithTemplate) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{template?.template?.name}</CardTitle>
                    <CardDescription>
                      {template?.template?.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Upload File</h4>
                    {template?.files?.length === 0 && (
                      <Input
                        key={fileInputKey}
                        type="file"
                        className="w-[200px]"
                        onChange={(e) => debouncedFileUpload(template.id, e)}
                        accept=".xlsx,.csv"
                        multiple={false}
                        disabled={isLoading}
                      />
                    )}
                  </div>
                  {template?.files?.length > 0 ? (
                    <div className="space-y-2">
                      {template.files.map((file: TemplateFile) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)} • Uploaded{" "}
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                file.status === FileStatus.SUCCESS
                                  ? "default"
                                  : file.status === FileStatus.ERROR
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {file.status}
                            </Badge>
                            {file.status && template.fieldMappings && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleViewMapping(template.id, file)
                                }
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteFile(template.id, file.id)
                              }
                              disabled={isLoading}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Upload your {template.template.name.toLowerCase()} file
                        here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {selectedFile && selectedTemplate && (
        <ViewMappingDialog
          open={!!selectedFile}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedFile(null);
              setSelectedTemplate(null);
            }
          }}
          file={selectedFile}
          template={selectedTemplate}
        />
      )}

      {uploadProgress.length > 0 && (
        <FileUploadProgressModal
          open={uploadProgress.some((file) => file.status === "uploading")}
          onOpenChange={(open) => {
            if (!open) {
              setUploadProgress([]);
            }
          }}
          files={uploadProgress}
        />
      )}

      {currentFile && showMappingDialog && (
        <MappingDialog
          key={currentFile?.id}
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          project={project}
          currentFile={currentFile}
          fileHeaders={fileHeaders}
          mappings={mappings}
          setMappings={setMappings}
          onSave={handleSaveMapping}
          onCancel={handleCancelMapping}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
