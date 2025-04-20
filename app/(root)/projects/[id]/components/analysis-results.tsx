import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  AlertCircle,
  FileText,
  RefreshCw,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { useEffect, useState, lazy, Suspense, useTransition } from "react";
import { exportResults, getAnalysisDetail, getAnalysisList } from "../actions";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Analysis, AnalysisResultsProps } from "./analysis/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components to reduce initial bundle size
const AnalysisSummary = lazy(() =>
  import("./analysis/analysis-summary").then((mod) => ({
    default: mod.AnalysisSummary,
  }))
);
const TestResultCard = lazy(() =>
  import("./analysis/test-result-card").then((mod) => ({
    default: mod.TestResultCard,
  }))
);

// Type for the lightweight analysis list items
interface AnalysisListItem {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt: string | Date;
  lastRunAt: string | Date | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  _count: {
    complianceResults: number;
  };
}

// Skeleton component for analysis summary
const AnalysisSummarySkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-48 rounded-md" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32 rounded-md" />
      <Skeleton className="h-32 rounded-md" />
      <Skeleton className="h-32 rounded-md" />
    </div>
  </div>
);

// Skeleton component for test result card
const TestResultCardSkeleton = () => (
  <Skeleton className="h-28 w-full rounded-md" />
);

export function AnalysisResults({
  project,
  onRunAnalysis,
}: AnalysisResultsProps) {
  // React useTransition for smoother UI updates
  const [isPending, startTransition] = useTransition();

  // State for list of analyses (lightweight)
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [analysisList, setAnalysisList] = useState<AnalysisListItem[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null
  );

  // State for detailed analysis data (loaded on demand)
  const [analysisDetail, setAnalysisDetail] = useState<Analysis | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [filter] = useState<"all" | "violations" | "errors" | "completed">(
    "all"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 5;

  // Fetch just the list of analyses without detailed results
  const fetchAnalysisList = async () => {
    try {
      setIsLoadingList(true);
      const response = await getAnalysisList(project.id);

      if (!response.status) {
        setError(response.message);
        return;
      }

      const fetchedList = response.data as AnalysisListItem[];
      setAnalysisList(fetchedList);

      // Select the first analysis ID if we don't have one selected yet
      if (!selectedAnalysisId && fetchedList.length > 0) {
        setSelectedAnalysisId(fetchedList[0].id);
        // Load details for the first analysis
        fetchAnalysisDetail(fetchedList[0].id);
      }

      setError(null);
    } catch {
      setError("Failed to fetch analysis list");
      toast({
        title: "Error",
        description: "Failed to fetch analysis list",
        variant: "destructive",
      });
    } finally {
      setIsLoadingList(false);
    }
  };

  // Fetch detailed results for a specific analysis
  const fetchAnalysisDetail = async (analysisId: string) => {
    if (!analysisId) return;

    try {
      setIsLoadingDetail(true);
      const response = await getAnalysisDetail(analysisId);

      if (!response.status) {
        toast({
          title: "Error",
          description: response.message || "Failed to load analysis details",
          variant: "destructive",
        });
        return;
      }

      // Wrap state updates in transition for smoother UI
      startTransition(() => {
        setAnalysisDetail(response.data as Analysis);
        setCurrentPage(1); // Reset to first page when analysis changes
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch analysis details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Only fetch analysis list when component mounts or project changes
  useEffect(() => {
    fetchAnalysisList();
    // Reset selected analysis when project changes
    setSelectedAnalysisId(null);
    setAnalysisDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Fetch analysis details when selected analysis changes
  useEffect(() => {
    if (selectedAnalysisId) {
      fetchAnalysisDetail(selectedAnalysisId);
    }
  }, [selectedAnalysisId]);

  // Calculate pagination for filtered results
  const filteredResults =
    analysisDetail?.complianceResults.filter((result) => {
      switch (filter) {
        case "violations":
          return (
            result.status === "COMPLETED" &&
            result.results &&
            result.results.length > 0
          );
        case "errors":
          return result.status === "FAILED" || result.errors;
        case "completed":
          return result.status === "COMPLETED";
        default:
          return true;
      }
    }) || [];

  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  // Handle analysis selection
  const handleAnalysisSelect = (analysisId: string) => {
    if (selectedAnalysisId === analysisId) return;
    setSelectedAnalysisId(analysisId);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to the top of the results section
    const resultsSection = document.getElementById("test-results-section");
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Loading states
  if (isLoadingList && analysisList.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error && analysisList.length === 0) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
          <h3 className="mb-2 text-lg font-medium">No Analysis Results</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Failed to load analysis results
          </p>
          <Button
            onClick={fetchAnalysisList}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (analysisList.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No Analysis Results</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Run a compliance analysis to see results here
          </p>
          <Button
            onClick={onRunAnalysis}
            className="bg-green-600 hover:bg-green-700"
            variant="default"
          >
            Run Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleExportResults = async () => {
    const response = await exportResults(analysisDetail?.id || "");
    if (response.status) {
      const { zipFilePath, filename } = response.data || {};
      if (zipFilePath && filename) {
        const link = document.createElement("a");
        link.target = "_blank";
        link.href = zipFilePath;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "Error",
          description: "Failed to export results",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: response.message || "Failed to export results",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Analysis Results</h2>
        <Button
          variant="outline"
          onClick={fetchAnalysisList}
          disabled={isLoadingList}
          className="gap-2"
        >
          {isLoadingList ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Analysis Selector - Show the lightweight list */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Analysis History:</div>
        <div className="flex flex-wrap gap-2">
          {analysisList.slice(0, 5).map((analysis) => (
            <Button
              key={analysis.id}
              variant={
                selectedAnalysisId === analysis.id ? "default" : "outline"
              }
              size="sm"
              onClick={() => handleAnalysisSelect(analysis.id)}
              className="flex items-center gap-2"
              disabled={isLoadingDetail && selectedAnalysisId !== analysis.id}
            >
              {isLoadingDetail && selectedAnalysisId === analysis.id ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              {format(new Date(analysis.createdAt), "PP")}
              <Badge variant="secondary" className="text-xs">
                {analysis._count.complianceResults} tests
              </Badge>
            </Button>
          ))}
          {analysisList.length > 5 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoadingDetail}>
                  More...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {analysisList.slice(5).map((analysis) => (
                  <DropdownMenuItem
                    key={analysis.id}
                    onClick={() => handleAnalysisSelect(analysis.id)}
                    disabled={
                      isLoadingDetail && selectedAnalysisId !== analysis.id
                    }
                  >
                    <div className="flex items-center gap-2">
                      {isLoadingDetail && selectedAnalysisId === analysis.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : null}
                      <span>{format(new Date(analysis.createdAt), "PPp")}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {analysis._count.complianceResults} tests
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Analysis Detail - Only shown when an analysis is selected */}
      {selectedAnalysisId && (
        <>
          {/* Loading state for analysis details - Initial load with no data */}
          {isLoadingDetail && !analysisDetail ? (
            <div className="space-y-6">
              <AnalysisSummarySkeleton />
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>Loading test results...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <TestResultCardSkeleton key={i} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : !analysisDetail ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Info className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Analysis Not Found</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  The selected analysis could not be loaded
                </p>
                <Button
                  onClick={() => fetchAnalysisList()}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                isPending || isLoadingDetail
                  ? "opacity-70 pointer-events-none transition-opacity"
                  : "transition-opacity"
              }
            >
              {/* Analysis Summary - Lazy loaded */}
              <Suspense fallback={<AnalysisSummarySkeleton />}>
                <AnalysisSummary analysis={analysisDetail} />
              </Suspense>

              {/* Test Results */}
              <Card id="test-results-section" className="mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Test Results
                        {(isPending || isLoadingDetail) && (
                          <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        Detailed results from individual compliance tests
                        {filteredResults.length > 0 &&
                          ` (Showing ${(currentPage - 1) * resultsPerPage + 1}-${Math.min(currentPage * resultsPerPage, filteredResults.length)} of ${filteredResults.length})`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportResults}
                      >
                        <FileText className="h-4 w-4" />
                        Export Results
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending || isLoadingDetail}
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Sort by Status</DropdownMenuItem>
                          <DropdownMenuItem>
                            Sort by Violations
                          </DropdownMenuItem>
                          <DropdownMenuItem>Sort by Test ID</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Switching between analyses loading state */}
                    {(isPending || isLoadingDetail) &&
                    paginatedResults.length === 0 ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <TestResultCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : (
                      paginatedResults.map((result) => (
                        <Suspense
                          key={result.id}
                          fallback={<TestResultCardSkeleton />}
                        >
                          <TestResultCard result={result} />
                        </Suspense>
                      ))
                    )}

                    {!isPending &&
                      !isLoadingDetail &&
                      (!filteredResults || filteredResults.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
                          <h3 className="mb-2 text-lg font-medium">
                            No Results Found
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {filter === "all"
                              ? "No test results available"
                              : `No ${filter} found in the current analysis`}
                          </p>
                        </div>
                      )}

                    {/* Pagination controls - only show if we have sufficient results */}
                    {filteredResults.length > resultsPerPage && (
                      <div className="flex items-center justify-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePageChange(Math.max(1, currentPage - 1))
                          }
                          disabled={
                            currentPage === 1 || isPending || isLoadingDetail
                          }
                        >
                          Previous
                        </Button>

                        {/* Page number buttons - show max 5 pages with ellipsis */}
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;

                          // Always show first page, last page, current page, and pages around current
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 &&
                              pageNum <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={isPending || isLoadingDetail}
                              >
                                {pageNum}
                              </Button>
                            );
                          }

                          // Show ellipsis for page gaps
                          if (
                            (pageNum === 2 && currentPage > 3) ||
                            (pageNum === totalPages - 1 &&
                              currentPage < totalPages - 2)
                          ) {
                            return <span key={pageNum}>...</span>;
                          }

                          return null;
                        })}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePageChange(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={
                            currentPage === totalPages ||
                            isPending ||
                            isLoadingDetail
                          }
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
