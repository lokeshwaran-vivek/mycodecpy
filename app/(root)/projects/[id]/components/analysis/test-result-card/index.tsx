import { useState } from "react";
import { ComplianceResultWithData, GLEntry } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  XCircle,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "../status-badge";
import { ResultTabs } from "./result-tabs";
import { parseErrors } from "../utils";

interface TestResultCardProps {
  result: ComplianceResultWithData;
}

export const TestResultCard = ({ result }: TestResultCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GLEntry | null>(null);

  const getAllErrors = () => {
    const errors: Array<{ row?: GLEntry; message: string }> = [];
    if (result.errors) {
      errors.push(...parseErrors(result.errors));
    }
    return errors;
  };

  const hasViolations = result.results && result.results.length > 0;
  const hasErrors = result.errors;
  const totalErrors = getAllErrors().length;
  const totalResults = result.results?.length || 0;

  const config = result.config;

  const getStatusColor = () => {
    if (result.status === "FAILED") return "border-red-200 bg-red-50";
    if (hasViolations) return "border-amber-200 bg-amber-50";
    if (result.status === "COMPLETED") return "border-green-200 bg-green-50";
    return "border-gray-200 bg-gray-50";
  };

  const getStatusIcon = () => {
    if (result.status === "FAILED")
      return <XCircle className="h-5 w-5 text-red-600" />;
    if (hasViolations)
      return <AlertOctagon className="h-5 w-5 text-amber-600" />;
    if (result.status === "COMPLETED")
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    return <Clock className="h-5 w-5 text-gray-600" />;
  };

  return (
    <Card className={`${getStatusColor()} shadow-sm`}>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-base">{result.testId}</CardTitle>
              <CardDescription className="flex items-center flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {result.status === "COMPLETED" &&
                      !hasViolations &&
                      "All checks passed"}
                    {hasViolations &&
                      `${result.results?.length} violations found`}
                  </div>

                  {result.status === "FAILED" && "Test execution failed"}
                  {(result.status === "IN_PROGRESS" ||
                    result.status === "QUEUED") &&
                    "Test in progress"}
                  {(hasErrors || totalResults > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {totalErrors} Errors
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {totalResults} Results
                      </Badge>
                    </div>
                  )}
                </div>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={result.status} />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col gap-2 my-1">
            <div className="font-semibold text-sm text-gray-600">
              Configurations:
            </div>
            {config &&
              Object.entries(config).map(([key, value]) => {
                const formattedKey = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <div key={key} className="flex items-center text-sm gap-1">
                    <span className="font-medium text-gray-600">
                      {formattedKey}:
                    </span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                );
              })}
          </div>
    
          <ResultTabs
            result={result}
            totalErrors={totalErrors}
            totalResults={totalResults}
            isDetailOpen={isDetailOpen}
            setIsDetailOpen={setIsDetailOpen}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
        </CardContent>
      )}
    </Card>
  );
};
