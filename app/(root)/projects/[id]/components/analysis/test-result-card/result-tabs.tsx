import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, AlertCircle } from "lucide-react";
import { ComplianceResultWithData, GLEntry } from "../types";
import { SummaryTab } from "./summary-tab";
import { ResultsTab } from "./results-tab";
import { ErrorsTab } from "./errors-tab";

interface ResultTabsProps {
  result: ComplianceResultWithData;
  totalErrors: number;
  totalResults: number;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  selectedItem: GLEntry | null;
  setSelectedItem: (item: GLEntry | null) => void;
}

export const ResultTabs = ({
  result,
  totalErrors,
  totalResults,
  isDetailOpen,
  setIsDetailOpen,
  selectedItem,
  setSelectedItem,
}: ResultTabsProps) => {
  const [activeTab, setActiveTab] = useState<"summary" | "results" | "errors">(
    "summary",
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary" disabled={!result.summary}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Summary
        </TabsTrigger>
        <TabsTrigger value="results" disabled={!totalResults}>
          <FileText className="mr-2 h-4 w-4" />
          Results ({totalResults})
        </TabsTrigger>
        <TabsTrigger value="errors" disabled={!result.errors}>
          <AlertCircle className="mr-2 h-4 w-4" />
          Errors ({totalErrors})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-4">
        <SummaryTab summary={result.summary} />
      </TabsContent>

      <TabsContent value="results" className="mt-4">
        <ResultsTab
          results={result.results}
          isDetailOpen={isDetailOpen}
          setIsDetailOpen={setIsDetailOpen}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </TabsContent>

      <TabsContent value="errors" className="mt-4">
        <ErrorsTab errors={result.errors} />
      </TabsContent>
    </Tabs>
  );
};
