import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { TemplateFile } from "@prisma/client";
import { ProjectWithTemplates } from "@/lib/types";
import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TemplateField } from "../types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { random } from "lodash";
import { PopoverContent } from "@/components/ui/popover";
import { Popover } from "@/components/ui/popover";
import { PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithTemplates;
  currentFile: TemplateFile | null;
  fileHeaders: string[];
  mappings: Record<string, string>;
  setMappings: (mappings: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

type TemplateFields = TemplateField[];

// Add a utility for chunking large header lists
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

// Memoized field row component for better performance
const FieldRow = memo(
  ({
    field,
    mappings,
    updateMapping,
    currentPage,
    visibleHeaders,
    allHeaders,
    showAllHeaders,
    searchActive,
    setShowAllHeaders,
  }: {
    field: TemplateField;
    mappings: Record<string, string>;
    updateMapping: (fieldName: string, header: string) => void;
    currentPage: number;
    visibleHeaders: string[];
    allHeaders: string[];
    showAllHeaders: boolean;
    searchActive: boolean;
    setShowAllHeaders: (value: boolean) => void;
  }) => {
    const currentValue = mappings[field.name] || "";
    const isRequired = field.required;
    const mappedHeaders = Object.values(mappings);

    // Track if dropdown is open to avoid unnecessary calculations
    const [isOpen, setIsOpen] = useState(false);

    // Add local search state for this dropdown
    const [fieldHeaderSearch] = useState("");
    const [localCurrentPage, setLocalCurrentPage] = useState(currentPage);
    const [localShowAllHeaders, setLocalShowAllHeaders] =
      useState(showAllHeaders);

    // Update local page when global page changes
    useEffect(() => {
      setLocalCurrentPage(currentPage);
    }, [currentPage]);

    // Update local show all headers when global changes
    useEffect(() => {
      setLocalShowAllHeaders(showAllHeaders);
    }, [showAllHeaders]);

    // Handle local header search
    const localFilteredHeaders = useMemo(() => {
      if (!fieldHeaderSearch) return visibleHeaders;

      const lowerSearch = fieldHeaderSearch.toLowerCase();
      return allHeaders.filter((header) =>
        header.toLowerCase().includes(lowerSearch)
      );
    }, [fieldHeaderSearch, visibleHeaders, allHeaders]);

    // Handle pagination
    const HEADERS_PER_PAGE = 15;
    const localPaginatedHeaders = useMemo(() => {
      return chunkArray(allHeaders, HEADERS_PER_PAGE);
    }, [allHeaders]);

    const localTotalPages = localPaginatedHeaders.length;

    // Determine which headers to display
    const displayHeaders = useMemo(() => {
      if (fieldHeaderSearch) return localFilteredHeaders;
      if (localShowAllHeaders) return allHeaders;
      return localPaginatedHeaders[localCurrentPage] || [];
    }, [
      fieldHeaderSearch,
      localFilteredHeaders,
      localShowAllHeaders,
      localPaginatedHeaders,
      localCurrentPage,
      allHeaders,
    ]);

    // Compute if header is on another page
    const isMappedToHeaderOnOtherPage =
      currentValue &&
      !visibleHeaders.includes(currentValue) &&
      !searchActive &&
      !showAllHeaders;

    // Only pre-compute available headers when dropdown is open
    const availableHeaders = useMemo(() => {
      // If dropdown isn't open, don't compute headers (optimization)
      if (!isOpen) return [];

      // Filter display headers to only show unmapped or currently mapped header
      const result = displayHeaders.filter(
        (header) => !mappedHeaders.includes(header) || header === currentValue
      );

      // Always include the currently mapped header if it exists
      if (currentValue && !result.includes(currentValue)) {
        result.unshift(currentValue);
      }

      return result;
    }, [displayHeaders, mappedHeaders, currentValue, isOpen]);

    // Apply global pagination change
    const applyGlobalPaginationChange = useCallback(() => {
      // Sync local page with global and update global setting
      setShowAllHeaders(localShowAllHeaders);
    }, [localShowAllHeaders, setShowAllHeaders]);

    return (
      <div
        className={`grid grid-cols-2 items-center gap-4 p-2 rounded-lg hover:bg-muted/50 ${
          isRequired && !currentValue ? "bg-red-50/50 dark:bg-red-950/20" : ""
        } ${isMappedToHeaderOnOtherPage ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {field.name}
              {isRequired && <span className="ml-1 text-orange-500">*</span>}
            </p>
            {currentValue && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">Template Field</p>
        </div>
        <div>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full">
                {currentValue || "Select a header"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-2">
              <>
                {!fieldHeaderSearch && (
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs text-muted-foreground">
                      {localShowAllHeaders
                        ? "All headers"
                        : `Page ${localCurrentPage + 1}/${localTotalPages}`}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-1.5"
                        onClick={() => {
                          setLocalShowAllHeaders(!localShowAllHeaders);
                          applyGlobalPaginationChange();
                        }}
                      >
                        {localShowAllHeaders ? "Pages" : "All"}
                      </Button>

                      {!localShowAllHeaders && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
                            onClick={() => {
                              const newPage = Math.max(0, localCurrentPage - 1);
                              setLocalCurrentPage(newPage);
                            }}
                            disabled={localCurrentPage === 0}
                          >
                            &lt;
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
                            onClick={() => {
                              const newPage = Math.min(
                                localTotalPages - 1,
                                localCurrentPage + 1
                              );
                              setLocalCurrentPage(newPage);
                            }}
                            disabled={localCurrentPage === localTotalPages - 1}
                          >
                            &gt;
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <Command>
                  <CommandInput placeholder="Search framework..." />
                  <CommandList>
                    <CommandEmpty>No framework found.</CommandEmpty>
                    <CommandGroup>
                      {availableHeaders.length > 0 ? (
                        availableHeaders.map((header) => (
                          <CommandItem
                            key={header}
                            onSelect={() => {
                              updateMapping(field.name, header);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentValue === header
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span>{header}</span>
                          </CommandItem>
                        ))
                      ) : (
                        <CommandItem>No available headers to map</CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }
);

// Ensure memo works correctly
FieldRow.displayName = "FieldRow";

export function MappingDialog({
  open,
  onOpenChange,
  project,
  currentFile,
  fileHeaders,
  mappings,
  setMappings,
  onSave,
  onCancel,
  isLoading,
}: MappingDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingHeaders, setIsLoadingHeaders] = useState(false);

  // Define a reasonable chunk size for headers - performance optimization
  const HEADERS_PER_PAGE = 15; // Further reduced for better performance

  // Memoize the template to prevent unnecessary re-renders
  const template = useMemo(
    () =>
      currentFile
        ? project.templates?.find((t) => t.id === currentFile.projectTemplateId)
        : null,
    [currentFile, project.templates]
  );

  // Memoize the template fields
  const templateFields = useMemo(() => {
    if (!template?.template?.fields) return [];
    return template.template.fields as unknown as TemplateFields;
  }, [template]);

  // Memoize pagination chunks - but do it less frequently
  const paginatedFileHeaders = useMemo(() => {
    // Chunk the array only once and cache the result
    return chunkArray(fileHeaders, HEADERS_PER_PAGE);
  }, [fileHeaders]);

  // Enhanced pagination states
  const [headerSearchTerm, setHeaderSearchTerm] = useState("");
  const [showAllHeaders, setShowAllHeaders] = useState(false);

  // Debounce header search to avoid performance issues with large lists
  const [debouncedHeaderSearch, setDebouncedHeaderSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHeaderSearch(headerSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [headerSearchTerm]);

  // Add header filtering capability - with debouncing
  const filteredHeaders = useMemo(() => {
    if (!debouncedHeaderSearch) return fileHeaders;

    // Use lowercase search term once
    const lowerSearch = debouncedHeaderSearch.toLowerCase();
    return fileHeaders.filter((header) =>
      header.toLowerCase().includes(lowerSearch)
    );
  }, [fileHeaders, debouncedHeaderSearch]);

  // Filtered and paginated headers
  const visibleHeaders = useMemo(() => {
    // If searching or showing all, don't paginate
    if (debouncedHeaderSearch) return filteredHeaders;
    if (showAllHeaders) return fileHeaders;

    // Otherwise show the current page
    // Make sure we return the correct page of headers
    return paginatedFileHeaders[currentPage] || [];
  }, [
    paginatedFileHeaders,
    currentPage,
    filteredHeaders,
    debouncedHeaderSearch,
    showAllHeaders,
    fileHeaders,
  ]);

  // Force pagination to start with first page chunk
  useEffect(() => {
    if (fileHeaders.length > 0 && !showAllHeaders && !debouncedHeaderSearch) {
      // Ensure we always start with page 0 when dialog opens
      setCurrentPage(0);
    }
  }, [fileHeaders.length, showAllHeaders, debouncedHeaderSearch]);

  // Check if we have a large header set that needs pagination
  const needsPagination = useMemo(
    () => fileHeaders.length > HEADERS_PER_PAGE,
    [fileHeaders.length]
  );

  // Make sure we initialize pagination properly
  useEffect(() => {
    // Only run on initial load
    if (needsPagination && paginatedFileHeaders.length > 0) {
      // Start with the first page of headers by default
      setShowAllHeaders(false);
    }
  }, [needsPagination, paginatedFileHeaders.length]);

  // Memoize the filtered fields
  const filteredTemplateFields = useMemo(() => {
    if (searchTerm === "") return templateFields;

    const lowerSearch = searchTerm.toLowerCase();
    return templateFields.filter((field) =>
      field.name.toLowerCase().includes(lowerSearch)
    );
  }, [templateFields, searchTerm]);

  // Memoize required fields
  const requiredFields = useMemo(() => {
    return templateFields.filter((field) => field.required);
  }, [templateFields]);

  // Memoize mapping status - compute once and cache
  const mappingStatus = useMemo(() => {
    // Count mapped fields
    const mappedCount = Object.keys(mappings).length;

    // Find mapped required fields
    let mappedRequiredCount = 0;
    let missingRequiredFields = false;

    for (const field of requiredFields) {
      if (mappings[field.name]) {
        mappedRequiredCount++;
      } else {
        missingRequiredFields = true;
      }
    }

    return {
      mappedCount,
      totalFields: templateFields.length,
      mappedRequiredCount,
      totalRequiredFields: requiredFields.length,
      missingRequiredFields,
    };
  }, [mappings, requiredFields, templateFields]);

  // Use a callback for updating mappings to reduce renders
  const updateMapping = useCallback(
    (fieldName: string, header: string) => {
      const newMappings = { ...mappings };

      // Remove old mapping if exists (header already mapped to another field)
      Object.entries(newMappings).forEach(([key, value]) => {
        if (value === header) {
          delete newMappings[key];
        }
      });

      // Add new mapping
      if (header) {
        newMappings[fieldName] = header;
      } else if (newMappings[fieldName]) {
        // If empty header is selected, remove mapping
        delete newMappings[fieldName];
      }

      // Update once
      setMappings(newMappings);
    },
    [mappings, setMappings]
  );

  // Simplified cancel handler
  const handleCancel = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(0);
    setHeaderSearchTerm("");
    setDebouncedHeaderSearch("");
    setShowAllHeaders(false);
    onCancel();
  }, [onCancel]);

  // Loading optimization
  useEffect(() => {
    if (fileHeaders.length > 100) {
      setIsLoadingHeaders(true);

      const timer = setTimeout(() => {
        setIsLoadingHeaders(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [fileHeaders.length]);

  // Add virtualized list optimization
  const templateFieldsToRender = useMemo(() => {
    // If search is active, limit the number of fields to display
    if (searchTerm) {
      return filteredTemplateFields.slice(0, 20); // Only show first 20 matches
    }
    return filteredTemplateFields;
  }, [filteredTemplateFields, searchTerm]);

  // If there are no fields to map, return null
  if (!templateFields.length) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          }
          onOpenChange(open);
        }}
      >
        <DialogContent
          className="max-w-3xl md:w-full w-[95vw]"
          style={{
            maxHeight: "90vh",
            height: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DialogHeader className="flex-shrink-0 pb-3">
            <DialogTitle>Map Template Fields to File Headers</DialogTitle>
            <DialogDescription>
              Match each template field to the corresponding column from your
              file. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>

          {isLoadingHeaders ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Preparing {fileHeaders.length} headers for mapping...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 flex-grow overflow-hidden min-h-0 flex flex-col">
                <div className="flex items-center justify-between px-2 flex-wrap gap-2 flex-shrink-0">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">
                      {mappingStatus.mappedCount}/{mappingStatus.totalFields}{" "}
                      Fields Mapped
                    </Badge>
                    <Badge
                      variant={
                        mappingStatus.missingRequiredFields
                          ? "destructive"
                          : "default"
                      }
                    >
                      {mappingStatus.mappedRequiredCount}/
                      {mappingStatus.totalRequiredFields} Required Fields
                    </Badge>
                  </div>
                </div>

                <div className="flex-shrink-0 mx-2 min-h-[50px]">
                  {mappingStatus.missingRequiredFields && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Some required fields are not mapped. Please map all
                        required fields before saving.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <ScrollArea
                  className="pr-4 flex-grow min-h-0"
                  style={{ height: "calc(min(50vh, 500px))" }}
                >
                  {currentFile && (
                    <div
                      key={`${currentFile.id}-${random(1000000)}`}
                      className="grid gap-3"
                    >
                      {templateFieldsToRender.map((field) => (
                        <FieldRow
                          key={`${field.name}-${random(1000000)}`}
                          field={field}
                          mappings={mappings}
                          updateMapping={updateMapping}
                          currentPage={currentPage}
                          visibleHeaders={visibleHeaders}
                          allHeaders={fileHeaders}
                          showAllHeaders={showAllHeaders}
                          searchActive={!!debouncedHeaderSearch}
                          setShowAllHeaders={setShowAllHeaders}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}

          <DialogFooter className="flex-shrink-0 sm:justify-end gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="sm:w-auto w-full"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isLoading || mappingStatus.missingRequiredFields}
              className="sm:w-auto w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Mapping"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Some required fields are not mapped. Are you sure you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onSave}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
