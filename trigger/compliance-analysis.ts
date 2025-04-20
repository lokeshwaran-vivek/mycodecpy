import { logger, task } from "@trigger.dev/sdk/v3";
import { complianceTests } from "../compliances";
import { Template, ProjectTemplate } from "@prisma/client";
import { deductComplianceCredits } from "../lib/wallet";
import { prisma } from "@/lib/prisma";

// Map of template names to their applicable test IDs
const TEMPLATE_TEST_MAPPING: Record<string, string[]> = {
  "General Ledger": [
    "seldom_accounts",
    "seldom_user_accounts",
    "repeating_numbers_journal",
    "recorded_approved_same_user",
    "no_username_journals",
    "record_no_approvals",
    "last_5_digits",
    "journals_with_keywords",
    "limited_character_entries",
    "entries_before_doc_date",
    "holiday_entries",
    "compound_journal_entries",
  ],
  "Trial Balance": [],
  "Sales Register": [
    "duplicate_invoices",
    "duplicate_invoices_same_date_different_customers",
    "duplicate_invoices_same_date_same_item",
    "missing_invoice_sequence",
    "customer_price_difference",
    "period_end_sales",
    "sudden_price_spike",
    "sudden_volume_spike",
    "unusual_product_discounts",
    "unusual_transaction_discounts",
  ],
  "Purchase Register": [
    "duplicate_period_invoices",
    "sudden_purchase_price_spike",
    "sudden_purchase_volume_spike",
    "vendor_price_difference",
    "purchase_order_quantity_mismatch",
  ],
  "Customer Listing": [
    "customer_days_outstanding",
    "long_outstanding_customers",
    "negative_receivables",
  ],
  "Vendors": [
    "supplier_days_outstanding",
    "long_outstanding_payables",
    "negative_payables",
  ],
  "Pay Register": [
    "duplicate_employee_code",
    "duplicate_pan",
    "duplicate_aadhar",
    "duplicate_uan",
    "duplicate_bank_account",
    "payroll_cost_spike",
  ],
  "Fixed Assets Register": [
    "capitalization_date_prior",
    "prior_year_capitalization",
    "low_value_capitalization",
    "negative_gross_block",
    "blank_narrations",
    "keyword_narrations",
    "existing_asset_additions",
    "deleted_assets_with_wdv",
    "different_useful_lives",
    "same_year_procurement_deletion",
    "duplicate_asset_codes",
  ],
  "Margin Cost Register": [],
  "Inventory Register": [
    "negative_inventory_quantity",
    "negative_inventory_rate",
    "low_margin_items",
    "no_sales_items",
    "no_movement_items",
    "slow_moving_inventory",
  ],
};

type ProjectTemplateWithTemplate = ProjectTemplate & {
  template: Template;
};

interface AnalysisPayload {
  analysisId: string;
  userId: string;
  projectId: string;
  selectedTests: string[];
  thresholds: Record<string, any>;
}

export const complianceAnalysisTask = task({
  id: "compliance-analysis",
  maxDuration: 300,
  run: async (payload: AnalysisPayload, { ctx }) => {
    const { analysisId, projectId, selectedTests, thresholds, userId } = payload;

    try {
      const analysisData = await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "IN_PROGRESS", progress: 0 },
      });

      const projectTemplates = (await prisma.projectTemplate.findMany({
        where: { projectId },
        include: { template: true },
      })) as ProjectTemplateWithTemplate[];

      let processedTests = 0;
      const totalTests = selectedTests.length;
      let anyTestsRun = false;

      // Separate single and cross-template tests
      const crossTemplateTests = selectedTests.filter((testId) => {
        const test = complianceTests.find((t) => t.id === testId);
        return test?.requiredTemplates && test.requiredTemplates.length > 1;
      });

      const singleTemplateTests = selectedTests.filter((testId) => !crossTemplateTests.includes(testId));

      // Process single-template tests
      for (const projectTemplate of projectTemplates) {
        const {
          template: { name: templateName },
          data: templateData,
        } = projectTemplate;
        const applicableTests = TEMPLATE_TEST_MAPPING[templateName] || [];
        const testsToRun = singleTemplateTests.filter((testId) =>
          applicableTests.includes(testId)
        );

        if (
          !testsToRun.length ||
          !Array.isArray(templateData) ||
          !templateData.length
        )
          continue;

        anyTestsRun = true;

        for (const testId of testsToRun) {
          const testDefinition = complianceTests.find(
            (test) => test.id === testId
          );
          if (!testDefinition) continue;

          const testConfig = {
            ...testDefinition.defaultConfig,
            ...(thresholds[testId] || {}),
          };

          try {
            const result = await testDefinition.testFunction(
              templateData,
              testConfig
            );
            await prisma.complianceResult.create({
              data: {
                testId,
                analysisId,
                status: "COMPLETED",
                config: testConfig,
                results: result.results,
                summary: result.summary,
                errors: result.errors,
                endedAt: new Date(),
              },
            });

            processedTests++;
            await updateAnalysisProgress(
              analysisId,
              processedTests,
              totalTests
            );
          } catch (error) {
            logger.error(`Test ${testId} failed:`, { error });
          }
        }
      }

      const templateDataMap = projectTemplates.reduce(
        (map, pt) => {
          if (Array.isArray(pt.data)) {
            map[pt.template.name] = pt.data;
          }
          return map;
        },
        {} as Record<string, any[]>
      );

      // Process cross-template tests
      for (const testId of crossTemplateTests) {
        const test = complianceTests.find((t) => t.id === testId);
        if (!test?.requiredTemplates) continue;

        const hasAllData = test.requiredTemplates.every(
          (name) =>
            Array.isArray(templateDataMap[name]) &&
            templateDataMap[name].length > 0
        );
        if (!hasAllData) continue;

        anyTestsRun = true;
        const templateData = test.requiredTemplates.reduce(
          (data, name) => {
            data[name] = templateDataMap[name];
            return data;
          },
          {} as Record<string, any[]>
        );

        try {
          // Use consistent test configuration approach
          const testConfig = {
            ...test.defaultConfig,
            ...(thresholds[testId] || {}),
          };

          const result = await test.testFunction(templateData, testConfig);

          await prisma.complianceResult.create({
            data: {
              testId,
              analysisId,
              status: "COMPLETED",
              config: testConfig,
              results: result.results,
              summary: result.summary,
              errors: result.errors,
              endedAt: new Date(),
            },
          });

          processedTests++;
          await updateAnalysisProgress(analysisId, processedTests, totalTests);
        } catch (error) {
          logger.error(`Cross-template test ${testId} failed:`, { error });
        }
      }

      await finalizeAnalysis(analysisId, anyTestsRun);
      await deductComplianceCredits(
        analysisData.businessId || "",
        analysisId,
        projectId,
        userId
      );
    } catch (error) {
      logger.error("Compliance analysis failed:", { error });
      throw error;
    }
  },
});

async function updateAnalysisProgress(
  analysisId: string,
  processed: number,
  total: number
) {
  await prisma.analysis.update({
    where: { id: analysisId },
    data: { progress: (processed / total) * 100 },
  });
}

async function finalizeAnalysis(analysisId: string, anyTestsRun: boolean) {
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: anyTestsRun ? "COMPLETED" : "FAILED",
      progress: anyTestsRun ? 100 : 0,
      lastRunAt: new Date(),
      metadata: !anyTestsRun
        ? {
            error: "No applicable tests could be run for the uploaded files",
          }
        : undefined,
    },
  });
}
