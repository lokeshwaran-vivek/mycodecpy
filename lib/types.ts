import {
  User as PrismaUser,
  ProjectTemplate,
  User,
  Template,
  Project,
  TemplateFile,
  Analysis as PrismaAnalysis,
  ComplianceResult,
} from "@prisma/client";

export type CustomUser = PrismaUser;

interface Analysis extends PrismaAnalysis {
  complianceResults: ComplianceResult[];
}

export interface CreateUserEmailProps {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role: string | null | undefined;
    status: string | null | undefined;
    type: string | null | undefined;
    password: string | null | undefined;
    businessId: string | null | undefined;
    isProfileComplete: boolean | null | undefined;
    emailVerified: boolean | null | undefined;
    image: string | null | undefined;
    id: string | null | undefined;
  };
}

export interface ProjectWithTemplates extends Project {
  templates?: ProjectTemplateWithTemplate[];
  team?: User[];
  members?: User[];
  analyses?: Analysis[];
}

export interface ProjectTemplateWithTemplate extends ProjectTemplate {
  template: Template;
  files: TemplateFile[];
}

export interface TemplateField {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  type: string;
}

export interface ComplianceTestResult {
  testId: string;
  status: "SUCCESS" | "FAILED";
  summary: {
    total: number;
    flagged: number;
    percentage: number;
  };
  results: {
    entries: Record<string, string | number | boolean | Date>[];
    details?: Record<string, unknown>;
  };
  error?: string;
}
