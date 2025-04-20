import { TemplateFile, ProjectTemplate, User } from "@prisma/client";

export interface ProjectFile extends TemplateFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: "SUCCESS" | "ERROR" | "PROCESSING";
  templateId: string;
  projectTemplateId: string;
  projectTemplate: ProjectTemplate;
  uploadedBy: User;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface TemplateField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface Template {
  id: string;
  name: string;
  status: "PENDING" | "UPLOADED" | "MAPPED" | "VERIFIED" | "REJECTED";
  description: string;
  fields: TemplateField[];
  files: ProjectFile[];
  fieldMappings?: Record<string, string>;
}
