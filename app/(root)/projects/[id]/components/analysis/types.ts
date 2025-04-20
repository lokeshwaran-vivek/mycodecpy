import {
  Analysis as PrismaAnalysis,
  ComplianceResult,
  Prisma,
} from "@prisma/client";
import { ProjectWithTemplates } from "@/lib/types";

export interface GLEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ErrorType {
  message: string;
  row?: GLEntry;
}

export interface TestResultData {
  results: GLEntry[];
  errors: ErrorType[];
  summary?: {
    totalChecked: number;
    issuesFound: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: Record<string, any>;
  };
}

export interface ComplianceResultWithData
  extends Omit<ComplianceResult, "results" | "errors" | "summary"> {
  results: GLEntry[] | null;
  summary: {
    totalChecked: number;
    issuesFound: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: Record<string, any>;
  } | null;
  errors: Array<{ row: GLEntry; message: string }> | string[] | string | null;
}

export type AnalysisMetadata = {
  error?: string;
  [key: string]: Prisma.JsonValue | undefined;
};

export interface Analysis extends Omit<PrismaAnalysis, "metadata"> {
  complianceResults: ComplianceResultWithData[];
  metadata: AnalysisMetadata | null;
}

export interface AnalysisResultsProps {
  project: ProjectWithTemplates;
  onRunAnalysis: () => void;
}
