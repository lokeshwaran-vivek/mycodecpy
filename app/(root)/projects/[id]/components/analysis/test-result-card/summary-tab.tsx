import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { formatValue, paginateData } from "../utils";
import { PaginationControls } from "../pagination";
import { ComplianceResultWithData } from "../types";

// Utility function to format numbers in Indian numbering system (2,48,346)
const formatNumber = (num: number): string => {
  const result = new Intl.NumberFormat('en-IN').format(num);
  return result;
};

interface SummaryTabProps {
  summary: ComplianceResultWithData["summary"];
}

export const SummaryTab = ({ summary }: SummaryTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  if (!summary || !Array.isArray(summary)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No Summary Available</h3>
        <p className="text-sm text-muted-foreground">
          Summary information is not available for this test
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Total Entries</CardTitle>
            <div className="text-2xl font-bold">
              {formatNumber(summary.length)}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Total Amount</CardTitle>
            <div className="text-2xl font-bold text-amber-600">
              {formatNumber(
                summary.reduce((acc, curr) => {
                  const debit =
                    typeof curr.debitAmount === "number" ? curr.debitAmount : 0;
                  const credit =
                    typeof curr.creditAmount === "number"
                      ? curr.creditAmount
                      : 0;
                  return acc + Math.max(debit, credit);
                }, 0)
              )}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Unique Entries</CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(
                new Set(summary.map((item) => item.journalEntryNumber)).size
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Summary Table with Pagination */}
      {summary.length > 0 && (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(summary[0]).map((key) => (
                    <TableHead key={key} className="text-sm">
                      {key.split(/(?=[A-Z])/).join(" ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginateData(summary, currentPage, pageSize).map(
                  (item, index) => (
                    <TableRow key={item.id || index}>
                      {Object.entries(item).map(([key, value], valueIndex) => (
                        <TableCell
                          key={`${key}-${valueIndex}`}
                          className="text-sm"
                        >
                          {Array.isArray(value) ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                              {value.map((arrayItem, arrayIndex) => (
                                <div
                                  key={arrayIndex}
                                  className="bg-muted/30 p-1 rounded"
                                >
                                  {typeof arrayItem === "object" &&
                                  arrayItem !== null ? (
                                    <div className="space-y-1">
                                      {Object.entries(arrayItem).map(
                                        ([subKey, subValue]) => (
                                          <Badge
                                            key={subKey}
                                            variant="outline"
                                            className="mr-1"
                                          >
                                            {`${subKey}: ${typeof subValue === 'number' ? formatNumber(subValue) : formatValue(subValue)}`}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  ) : typeof arrayItem === 'number' ? (
                                    formatNumber(arrayItem)
                                  ) : (
                                    formatValue(arrayItem)
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : typeof value === "object" && value !== null ? (
                            <div className="space-y-1">
                              {Object.entries(value).map(
                                ([subKey, subValue]) => (
                                  <Badge
                                    key={subKey}
                                    variant="outline"
                                    className="mr-1"
                                  >
                                    {`${subKey}: ${typeof subValue === 'number' ? formatNumber(subValue) : formatValue(subValue)}`}
                                  </Badge>
                                ),
                              )}
                            </div>
                          ) : typeof value === "number" ? (
                            formatNumber(value)
                          ) : (
                            formatValue(value)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            totalItems={summary.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};
