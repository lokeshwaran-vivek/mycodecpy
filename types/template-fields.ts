export interface TemplateField {
  name: string;
  type: TemplateFieldType;
  required: boolean;
  description?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  fields: TemplateField[];
}

export type TemplateFieldType =
  | "text"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "file";

export const TEMPLATE_FIELD_TYPES = [
  { value: "text" as const, label: "Text" },
  { value: "number" as const, label: "Number" },
  { value: "date" as const, label: "Date" },
  { value: "email" as const, label: "Email" },
  { value: "phone" as const, label: "Phone" },
  { value: "textarea" as const, label: "Text Area" },
  { value: "select" as const, label: "Select" },
  { value: "checkbox" as const, label: "Checkbox" },
  { value: "file" as const, label: "File Upload" },
] as const;

export const TEMPLATES_PER_PAGE = 5;
