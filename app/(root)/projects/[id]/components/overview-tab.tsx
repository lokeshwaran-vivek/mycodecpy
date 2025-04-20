import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Clock, FileText, Users } from "lucide-react";
import { AnalysisResults } from "./analysis-results";
import { FileStatus, TemplateStatus } from "@prisma/client";
import { ProjectWithTemplates } from "@/lib/types";

interface OverviewTabProps {
  project: ProjectWithTemplates;
  onUploadClick: () => void;
  onRunAnalysis: () => void;
}

export function OverviewTab({
  project,
  onUploadClick,
  onRunAnalysis,
}: OverviewTabProps) {
  // Safely handle undefined templates
  const templates = project?.templates || [];
  const hasFiles = templates.some((t) => t.files?.length > 0);

  // Calculate file statistics with null checks
  const totalFiles = templates.reduce(
    (acc, t) => acc + (t.files?.length || 0),
    0
  );

  const processedFiles = templates.reduce(
    (acc, t) =>
      acc +
      (t.files?.filter((f) => f?.status === FileStatus.SUCCESS)?.length || 0),
    0
  );

  const errorFiles = templates.reduce(
    (acc, t) =>
      acc +
      (t.files?.filter((f) => f?.status === FileStatus.ERROR)?.length || 0),
    0
  );

  const verifiedTemplates = templates.filter(
    (t) => t?.status === TemplateStatus.VERIFIED
  ).length;

  const progress = project?.progress || 0;
  const members = project?.members || [];

  // Handle empty state
  if (!project) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Project Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The requested project could not be loaded
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle no files state
  if (!hasFiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Your New Project</CardTitle>
          <CardDescription>
            Get started by uploading your financial documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Files Uploaded Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your financial documents to start analyzing your data
            </p>
            <Button onClick={onUploadClick}>Upload Files</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle loading state for files being processed
  const isProcessing = templates.some((t) =>
    t.files?.some((f) => f?.status === FileStatus.PROCESSING)
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <p className="text-xs text-muted-foreground">
              {isProcessing ? "Processing..." : "Overall completion"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {members.length === 1 ? "Active member" : "Active members"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Files Uploaded
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {verifiedTemplates}{" "}
              {verifiedTemplates === 1 ? "template" : "templates"} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Processing Status
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedFiles}</div>
            <p className="text-xs text-muted-foreground">
              {errorFiles > 0
                ? `${errorFiles} ${errorFiles === 1 ? "file" : "files"} with errors`
                : "All files processed successfully"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {project && (
        <AnalysisResults project={project} onRunAnalysis={onRunAnalysis} />
      )}
    </div>
  );
}
