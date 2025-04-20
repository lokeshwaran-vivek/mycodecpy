import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  FileSpreadsheet,
  AlertOctagon,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Analysis } from "./types";
import { StatusBadge } from "./status-badge";

interface AnalysisSummaryProps {
  analysis: Analysis;
}

export const AnalysisSummary = ({ analysis }: AnalysisSummaryProps) => {
  const totalTests = analysis.complianceResults.length;
  const completedTests = analysis.complianceResults.filter(
    (r) => r.status === "COMPLETED",
  ).length;
  const failedTests = analysis.complianceResults.filter(
    (r) => r.status === "FAILED",
  ).length;
  const inProgressTests = analysis.complianceResults.filter(
    (r) => r.status === "IN_PROGRESS" || r.status === "QUEUED",
  ).length;

  const violationResults = analysis.complianceResults.filter(
    (r) => r.status === "COMPLETED" && r.results && r.results.length > 0,
  );

  const totalViolations = violationResults.reduce(
    (sum, r) => sum + (r.results?.length || 0),
    0,
  );

  const totalChecked = analysis.complianceResults.reduce((sum, r) => {
    return sum + (r.summary?.totalChecked || 0);
  }, 0);

  const complianceScore =
    totalChecked > 0
      ? Math.round(((totalChecked - totalViolations) / totalChecked) * 100)
      : completedTests > 0
        ? Math.round((completedTests / totalTests) * 100)
        : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Analysis Summary</CardTitle>
            <CardDescription>
              {analysis.status === "COMPLETED"
                ? `Completed on ${format(new Date(analysis.lastRunAt!), "PPp")}`
                : "Analysis in progress"}
            </CardDescription>
          </div>
          <StatusBadge status={analysis.status} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar for In Progress Analysis */}
        {(analysis.status === "IN_PROGRESS" ||
          analysis.status === "QUEUED") && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>
                {analysis.status === "QUEUED"
                  ? "Waiting to start..."
                  : "Running tests..."}
              </span>
              <span>{Math.round(analysis.progress)}% complete</span>
            </div>
            <Progress value={analysis.progress} className="h-2" />
          </div>
        )}

        {/* Analysis Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliance Score
              </CardTitle>
              <ShieldCheck
                className={`h-4 w-4 ${
                  complianceScore >= 80
                    ? "text-green-600"
                    : complianceScore >= 60
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  complianceScore >= 80
                    ? "text-green-600"
                    : complianceScore >= 60
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {complianceScore}%
              </div>
              <p className="text-xs text-muted-foreground">
                {complianceScore >= 80
                  ? "Good standing"
                  : complianceScore >= 60
                    ? "Needs attention"
                    : "Requires immediate action"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTests}</div>
              <p className="text-xs text-muted-foreground">
                {completedTests} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Violations</CardTitle>
              <AlertOctagon className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {totalViolations}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {violationResults.length} tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Tests
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {failedTests}
              </div>
              <p className="text-xs text-muted-foreground">
                {inProgressTests} still running
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
