import { getTemplateTypes } from "@/app/(root)/settings/template-types/actions";
import TemplateTypesClient from "@/components/dashboard/settings/template-types-client";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { search = "", page = 1 } = await searchParams;

  const { data: templateTypes } = await getTemplateTypes(
    search as string,
    parseInt(page as string)
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Template Types</h3>
          <p className="text-sm text-muted-foreground">
            Manage document template types and their fields
          </p>
        </div>
      </div>
      <TemplateTypesClient
        templateTypes={templateTypes?.data || []}
        totalPages={templateTypes?.totalPages || 0}
      />
    </div>
  );
}
