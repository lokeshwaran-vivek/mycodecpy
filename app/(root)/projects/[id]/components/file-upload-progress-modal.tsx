"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: {
    name: string;
    progress: number;
    status: "uploading" | "success" | "error";
    error?: string;
    message?: string;
    size?: number;
  }[];
  onComplete?: () => void;
  autoCloseDelay?: number; // Optional delay in ms before auto-closing
}

export function FileUploadProgressModal({
  open,
  onOpenChange,
  files,
  onComplete,
  autoCloseDelay = 1500, // Default to 1.5 seconds
}: FileUploadProgressModalProps) {
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [simulatedFiles, setSimulatedFiles] = useState(files);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Function to determine upload speed based on progress
  const getUploadSpeed = (progress: number): number => {
    if (progress < 60) return 0.4; // Slower initial speed (was 5)
    if (progress < 80) return 0.2; // Slower medium speed (was 2)
    if (progress < 90) return 0.1; // Slower finalizing speed (was 1)
    return 0.05; // Very slow final speed (was 0.5)
  };

  // Save scroll position before updates
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Restore scroll position after updates
  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  };

  // Initialize and manage progress simulation
  useEffect(() => {
    if (!open) {
      // Clear the interval when modal closes
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
        autoCloseTimeoutRef.current = null;
      }
      return;
    }

    // Reset simulated files when modal opens
    setSimulatedFiles(
      files.map((file) => ({
        ...file,
        progress: file.status === "uploading" ? 0 : file.progress,
        // If file is already successful, ensure progress is 100%
        ...(file.status === "success" ? { progress: 100 } : {}),
      }))
    );

    // Create an interval to simulate progress
    simulationIntervalRef.current = setInterval(() => {
      saveScrollPosition();
      setSimulatedFiles((prev) => {
        const updated = prev.map((file) => {
          // If file is successful, always ensure progress is 100%
          if (file.status === "success") {
            return { ...file, progress: 100 };
          }

          // Only update progress for uploading files that haven't reached 100% yet
          if (file.status !== "uploading" || file.progress >= 100) {
            return file;
          }

          const speed = getUploadSpeed(file.progress);
          const newProgress = Math.min(file.progress + speed, 99.9); // Cap at 99.9% to indicate waiting for completion

          return {
            ...file,
            progress: newProgress,
          };
        });

        return updated;
      });
      // Use setTimeout to ensure the DOM has updated before restoring scroll
      setTimeout(restoreScrollPosition, 0);
    }, 300);

    // Check if original files status changes to update our simulated files
    const checkForStatusUpdates = () => {
      saveScrollPosition();
      setSimulatedFiles((prev) => {
        return prev.map((simulatedFile) => {
          // Find corresponding file in the original files prop
          const originalFile = files.find((f) => f.name === simulatedFile.name);

          if (originalFile) {
            // Always ensure successful files have 100% progress
            if (originalFile.status === "success") {
              return { ...simulatedFile, status: "success", progress: 100 };
            }

            // Update status if it has changed
            if (originalFile.status !== simulatedFile.status) {
              if (originalFile.status === "error") {
                return {
                  ...simulatedFile,
                  status: "error",
                  error: originalFile.error,
                };
              }
            }
          }
          return simulatedFile;
        });
      });
      // Use setTimeout to ensure the DOM has updated before restoring scroll
      setTimeout(restoreScrollPosition, 0);
    };

    // Check for status updates from parent component
    const statusCheckInterval = setInterval(checkForStatusUpdates, 300);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      clearInterval(statusCheckInterval);
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
        autoCloseTimeoutRef.current = null;
      }
    };
  }, [open, files]);

  useEffect(() => {
    // Check if all files are either success or error
    const allComplete = simulatedFiles.every(
      (file) => file.status === "success" || file.status === "error"
    );

    setIsAllComplete(allComplete);

    if (allComplete) {
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }

      // Auto-close the modal after delay
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }

      autoCloseTimeoutRef.current = setTimeout(() => {
        onOpenChange(false);
      }, autoCloseDelay);
    }
  }, [simulatedFiles, onComplete, onOpenChange, autoCloseDelay]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Uploading Files</DialogTitle>
        <DialogDescription>
          {isAllComplete
            ? "All files have been processed."
            : "Please wait while your files are being uploaded..."}
        </DialogDescription>
      </DialogHeader>
        <div
          ref={scrollContainerRef}
          className="space-y-4 max-h-[60vh] overflow-y-auto overflow-x-hidden py-4"
        >
          {simulatedFiles.map((file, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {file.name}
                  </span>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {file.status === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {file.status === "uploading" && (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                </div>
              </div>

              <Progress
                value={file.progress}
                className={cn(
                  "h-2",
                  file.status === "success" ? "bg-green-100" : "",
                  file.status === "error" ? "bg-red-100" : ""
                )}
              />

              <div className="flex justify-between text-xs text-muted-foreground w-full">
                <span className="flex-shrink-0 w-[40px]">{file.progress.toFixed(1)}%</span>
                <span className="flex-shrink-0 text-right truncate">
                  {file.status === "uploading" && (
                    file.message
                      ? file.message
                      : file.progress < 60
                        ? "Uploading..."
                        : file.progress < 80
                          ? "Processing..."
                          : file.progress < 90
                            ? "Finalizing..."
                            : file.progress >= 99.9
                              ? "Waiting for server..."
                              : "Completing..."
                  )}
                  {file.status === "success" && (
                    <span className="text-green-500">
                      Complete
                    </span>
                  )}
                  {file.status === "error" && (
                    <span className="text-red-500">
                      Failed
                    </span>
                  )}
                </span>
              </div>

              {file.status === "error" && file.error && (
                <p className="text-xs text-red-500 break-words">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
