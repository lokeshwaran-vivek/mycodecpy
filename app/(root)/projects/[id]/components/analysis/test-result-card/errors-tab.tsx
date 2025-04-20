import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { ComplianceResultWithData, GLEntry } from "../types";
import { formatValue, parseErrors, paginateData } from "../utils";
import { PaginationControls } from "../pagination";

interface ErrorsTabProps {
  errors: ComplianceResultWithData["errors"];
}

export const ErrorsTab = ({ errors }: ErrorsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const getGroupedErrors = () => {
    const parsedErrors = parseErrors(errors);
    const groupedErrors = new Map<
      string,
      Array<{ row?: GLEntry; message: string }>
    >();

    parsedErrors.forEach((error) => {
      const existingGroup = groupedErrors.get(error.message) || [];
      groupedErrors.set(error.message, [...existingGroup, error]);
    });

    return Array.from(groupedErrors.entries()).map(([message, errors]) => ({
      message,
      errors,
      hasRows: errors.some((e) => e.row),
    }));
  };

  const groupedErrors = getGroupedErrors();

  return (
    <div className="space-y-4">
      {groupedErrors.map((group, groupIndex) => {
        const errorsWithRows = group.errors.filter(
          (error): error is { row: GLEntry; message: string } =>
            Boolean(error.row),
        );

        return (
          <div
            key={`group-${groupIndex}`}
            className="rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
              <div className="w-full">
                <div className="text-sm text-red-800 font-medium">
                  {group.message}
                  {group.errors.length > 1 && (
                    <span className="ml-2 text-xs text-red-600">
                      ({group.errors.length} occurrences)
                    </span>
                  )}
                </div>

                {group.hasRows && errorsWithRows.length > 0 && (
                  <>
                    <div className="mt-3 rounded-md bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(errorsWithRows[0].row).map((key) => (
                              <TableHead key={key} className="text-xs">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginateData(
                            errorsWithRows,
                            currentPage,
                            pageSize,
                          ).map((error, errorIndex) => (
                            <TableRow key={`row-${errorIndex}`}>
                              {Object.entries(error.row).map(
                                ([key, value], valueIndex) => (
                                  <TableCell
                                    key={`${key}-${valueIndex}`}
                                    className="text-xs"
                                  >
                                    {typeof value === "object" &&
                                    value !== null ? (
                                      <div className="space-y-1">
                                        {Object.entries(value).map(
                                          ([subKey, subValue]) => (
                                            <span
                                              key={subKey}
                                              className="mr-1 block"
                                            >
                                              {`${subKey}: ${formatValue(subValue)}`}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    ) : typeof value === "number" ? (
                                      value.toLocaleString()
                                    ) : (
                                      formatValue(value)
                                    )}
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <PaginationControls
                      totalItems={errorsWithRows.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
