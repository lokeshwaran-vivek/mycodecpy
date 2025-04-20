import seldomAccounts from "./gl/seldomAccounts";
import seldomUserAccounts from "./gl/seldomUserAccounts";
import repeatingNumbersJournal from "./gl/repeatingNumbersJournal";
import recordedAndApprovedBySame from "./gl/recordedAndApprovedBySame";
import recordWithNoApprovals from "./gl/recordWithNoApprovals";
import last5Digits from "./gl/last5Digits";
import journalsContainingKeywords from "./gl/journalsContainingKeywords";
import journalsWithNoUsername from "./gl/journalsWithNoUsername";
import entriesBeforeDocDate from "./gl/entriesBeforeDocDate";
import holidayEntries from "./gl/holidayEntries";
import compoundJournalEntries from "./gl/compoundJournalEntries";
import journalEntriesWithLimitedCharacters from "./gl/journalEntriesWithLimitedCharacters";
import duplicateInvoices from "./sales/duplicateInvoices";
import duplicateInvoicesSameDateDifferentCustomers from "./sales/duplicateInvoicesSameDateDifferentCustomers";
import missingInvoiceSequence from "./sales/missingInvoiceSequence";
import suddenPriceSpike from "./sales/suddenPriceSpike";
import suddenVolumeSpike from "./sales/suddenVolumeSpike";
import customerPriceDifference from "./sales/customerPriceDifference";
import periodEndSales from "./sales/periodEndSales";
import unusualProductDiscounts from "./sales/unusualProductDiscounts";
import duplicatePeriodInvoices from "./purchase/duplicatePeriodInvoices";
import suddenPurchasePriceSpike from "./purchase/suddenPurchasePriceSpike";
import suddenPurchaseVolumeSpike from "./purchase/suddenPurchaseVolumeSpike";
import vendorPriceDifference from "./purchase/vendorPriceDifference";
import purchaseOrderQuantityMismatch from "./purchase/purchaseOrderQuantityMismatch";
import duplicateEmployeeCode from "./payroll/duplicateEmployeeCode";
import duplicatePAN from "./payroll/duplicatePAN";
import duplicateAadhar from "./payroll/duplicateAadhar";
import duplicateUAN from "./payroll/duplicateUAN";
import duplicateBankAccount from "./payroll/duplicateBankAccount";
import payrollCostSpike from "./payroll/payrollCostSpike";
import customerDaysOutstanding from "./customer/customerDaysOutstanding";
import longOutstandingCustomers from "./customer/longOutstandingCustomers";
import negativeReceivables from "./customer/negativeReceivables";
import supplierDaysOutstanding from "./vendor/supplierDaysOutstanding";
import longOutstandingPayables from "./vendor/longOutstandingPayables";
import negativePayables from "./vendor/negativePayables";
import negativeQuantity from "./inventory/negativeQuantity";
import negativeRate from "./inventory/negativeRate";
import lowMarginItems from "./inventory/lowMarginItems";
import noSalesItems from "./inventory/noSalesItems";
import noMovementItems from "./inventory/noMovementItems";
import slowMovingInventory from "./inventory/slowMovingInventory";
import unusualTransactionDiscounts from "./sales/unusualTransactionDiscounts";
import capitalizationDatePrior from "./fixedAssets/capitalizationDatePrior";
import priorYearCapitalization from "./fixedAssets/priorYearCapitalization";
import lowValueCapitalization from "./fixedAssets/lowValueCapitalization";
import negativeGrossBlock from "./fixedAssets/negativeGrossBlock";
import blankNarrations from "./fixedAssets/blankNarrations";
import keywordNarrations from "./fixedAssets/keywordNarrations";
import existingAssetAdditions from "./fixedAssets/existingAssetAdditions";
import deletedAssetsWithWDV from "./fixedAssets/deletedAssetsWithWDV";
import differentUsefulLives from "./fixedAssets/differentUsefulLives";
import sameYearProcurementDeletion from "./fixedAssets/sameYearProcurementDeletion";
import duplicateAssetCodes from "./fixedAssets/duplicateAssetCodes";
import { TemplateName } from "@/prisma/data/template";
import duplicateInvoicesSameDateSameItem from "./sales/duplicateInvoicesSameDateSameItem";

type ComplianceTestConfig = {
  /**
   * General threshold for numeric comparisons
   * Used by many tests as their primary configuration parameter
   */
  threshold?: number;

  /**
   * Minimum number of transactions for account activity tests
   * Used by: seldom_accounts, seldom_user_accounts
   */
  minimumTransactions?: number;

  /**
   * Minimum characters required for journal entry descriptions
   * Used by: limited_character_entries
   */
  minimumCharacters?: number;

  /**
   * Number of zeros to look for in repeating pattern tests
   * Used by: repeating_numbers_journal
   */
  numberOfZeros?: number;

  /**
   * Number of digits to check in pattern tests
   * Used by: last_5_digits
   */
  digitCount?: number;

  /**
   * Minimum value threshold for financial amount tests
   * Used by: low_value_capitalization
   */
  minValue?: number;

  /**
   * Keywords to search for in description/narration fields
   * Used by: journals_containing_keywords, keyword_narrations
   */
  keywords?: string[];

  /**
   * Whether keyword searches should be case sensitive
   * Used by: journals_containing_keywords, keyword_narrations
   */
  caseSensitive?: boolean;

  /**
   * Days of the week to consider as holidays (0 = Sunday, 1 = Monday, etc.)
   * Used by: holiday_entries
   */
  holidayDays?: number[];

  /**
   * Specific dates to consider as holidays (format: YYYY-MM-DD)
   * Used by: holiday_entries
   */
  holidayDates?: string[];

  /**
   * Period type for time-based analysis (month or week)
   * Used by: period_end_sales
   */
  periodType?: "month" | "week";

  /**
   * Number of days at the end of a period for period-end analysis
   * Used by: period_end_sales
   */
  endDays?: number;

  /**
   * Prefix string for sequence analysis
   * Used by: missing_invoice_sequence
   */
  prefix?: string;

  /**
   * Margin threshold percentage for profitability tests
   * Used by: low_margin_items
   */
  marginThreshold?: number;

  /**
   * Value threshold for financial tests
   * Used by: sudden_price_spike, sudden_volume_spike
   */
  valueThreshold?: number;

  /**
   * Maximum number of assets to analyze
   * Used by: different_useful_lives
   */
  maxAssets?: number;

  /**
   * Number of recent transactions to analyze
   * Used by: existing_asset_additions
   */
  recentTransactionsCount?: number;

  /**
   * Cut-off date for historical analysis
   * Used by: prior_year_capitalization
   */
  cutOffDate?: string | Date;

  /**
   * Cut-off days for historical analysis
   * Used by: prior_year_capitalization
   */
  cutOffDays?: number;

  /**
   * Period of transaction for historical analysis
   * Used by: prior_year_capitalization
   */
  periodOfTransaction?: number;

  /**
   * Financial year start date
   * Used by: prior_year_capitalization
   */
  financialYearStart?: string | Date;
};

/**
 * Represents a compliance test definition
 * Each test has a unique ID, name, description, category, default configuration,
 * test function, and optional template requirements
 */
type ComplianceTest = {
  /**
   * Unique identifier for the test
   */
  id: string;

  /**
   * Display name for the test
   */
  name: string;

  /**
   * Detailed description of what the test checks for
   * Should include placeholder {n} for configurable thresholds when applicable
   */
  description: string;

  /**
   * Category the test belongs to for grouping in the UI
   */
  category: string;

  /**
   * Default configuration parameters for the test
   * Should include all configuration parameters the test function expects
   * Even if a test doesn't need configuration, an empty object should be provided
   */
  defaultConfig: ComplianceTestConfig;

  /**
   * The function that implements the test logic
   * Should accept data and configuration parameters
   */
  testFunction: Function;

  /**
   * Template types required for this test to run
   * Used to determine which tests are available based on uploaded templates
   */
  requiredTemplates: string[];
};

export const complianceTests: ComplianceTest[] = [
  // General Ledger
  {
    id: "seldom_accounts",
    name: "Seldom Used Accounts",
    description:
      "Identifies general ledger accounts that are rarely used in transactions (less than {n} times)",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      minimumTransactions: 10,
    },
    testFunction: seldomAccounts,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "seldom_user_accounts",
    name: "Seldom User Accounts",
    description:
      "Detects user accounts with minimal transaction activity (less than {n} transactions)",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      minimumTransactions: 10,
    },
    testFunction: seldomUserAccounts,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "repeating_numbers_journal",
    name: "Repeating Numbers in Journal",
    description:
      "Identifies journal entries with suspicious repeating number patterns in amounts (at least {n} digits)",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      digitCount: 5,
    },
    testFunction: repeatingNumbersJournal,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "recorded_approved_same_user",
    name: "Same User Recording and Approval",
    description:
      "Detects journal entries where the same user both recorded and approved the transaction",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {},
    testFunction: recordedAndApprovedBySame,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "record_no_approvals",
    name: "Records Without Approvals",
    description: "Identifies journal entries that lack proper approval",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {},
    testFunction: recordWithNoApprovals,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "last_5_digits",
    name: "Last 5 Digits Analysis",
    description:
      "Analyzes the last {n} digits of transaction amounts to detect potential anomalies or manual manipulation",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      digitCount: 5,
    },
    testFunction: last5Digits,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "journals_with_keywords",
    name: "Keyword Detection in Journals",
    description:
      "Searches for specific keywords in journal entries that might indicate unusual transactions",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      keywords: [
        "adjustment",
        "correction",
        "error",
        "reverse",
        "Fraud",
        "Bribe",
        "instruction of MD",
        "MD family",
        "Personal trip",
        "Secret",
      ],
      caseSensitive: false,
    },
    testFunction: journalsContainingKeywords,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "no_username_journals",
    name: "Journals With No Username",
    description:
      "Identifies journal entries with no user information, which may indicate system postings or automated entries",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      // This test doesn't require parameters but we define an empty object
      // for consistency across all tests
    },
    testFunction: journalsWithNoUsername,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "limited_character_entries",
    name: "Limited Character Entries",
    description:
      "Detects journal entries with insufficient description (less than {n} characters)",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      minimumCharacters: 10,
    },
    testFunction: journalEntriesWithLimitedCharacters,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "entries_before_doc_date",
    name: "Entries Before Document Date",
    description: "Identifies entries recorded before their document date",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      // This test doesn't require custom configuration parameters
      // but we explicitly define an empty object for clarity and consistency
    },
    testFunction: entriesBeforeDocDate,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "holiday_entries",
    name: "Holiday Transaction Entries",
    description:
      "Detects journal entries recorded during holidays or non-business days",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      holidayDays: [],
      holidayDates: [],
    },
    testFunction: holidayEntries,
    requiredTemplates: [TemplateName.GeneralLedger],
  },
  {
    id: "compound_journal_entries",
    name: "Compound Journal Entries",
    description:
      "Identifies complex journal entries with multiple line items (more than {n} items)",
    category: "Potential Management Override of Control Analytics",
    defaultConfig: {
      threshold: 5,
    },
    testFunction: compoundJournalEntries,
    requiredTemplates: [TemplateName.GeneralLedger],
  },





  // Invoice
  {
    id: "duplicate_invoices",
    name: "Duplicate Invoice Numbers",
    description:
      "Identifies journal entries with duplicate invoice numbers that may indicate double-posting or fraud",
    category: "Revenue Analytics",
    defaultConfig: {
      // No specific configuration needed for this test
      // It detects exact duplicates without requiring thresholds
    },
    testFunction: duplicateInvoices,
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "duplicate_invoices_same_date_different_customers",
    name: "Duplicate Invoice Numbers on Same Date with Different Customers",
    description:
      "Identifies journal entries with duplicate invoice numbers that appear on the same date with different customers",
    category: "Revenue Analytics",
    defaultConfig: {},
    testFunction: duplicateInvoicesSameDateDifferentCustomers,
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "duplicate_invoices_same_date_same_item",
    name: "Duplicate Invoice Numbers on Same Date with Same Items",
    description:
      "Identifies journal entries with duplicate invoice numbers that appear on the same date with same items",
    category: "Revenue Analytics",
    defaultConfig: {},
    testFunction: duplicateInvoicesSameDateSameItem,
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "missing_invoice_sequence",
    name: "Missing Invoice Sequence",
    description:
      "Identifies gaps in invoice number sequences that could indicate missing transactions",
    category: "Revenue Analytics",
    testFunction: missingInvoiceSequence,
    defaultConfig: {
      prefix: "INV",
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "customer_price_difference",
    name: "Customer Price Variations",
    description:
      "Identifies products sold at prices that deviate more than {threshold}% from the average selling price",
    category: "Revenue Analytics",
    testFunction: customerPriceDifference,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "period_end_sales",
    name: "Period End Sales Analysis",
    description:
      "Analyzes sales patterns in the last {endDays} days of each period compared to regular days",
    category: "Revenue Analytics",
    testFunction: periodEndSales,
    defaultConfig: {
      periodType: "month",
      endDays: 3,
      threshold: 10,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "sudden_price_spike",
    name: "Sudden Price Changes",
    description:
      "Identifies sudden increases or decreases in product selling prices above {threshold}% compared to previous transaction",
    category: "Revenue Analytics",
    testFunction: suddenPriceSpike,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "sudden_volume_spike",
    name: "Sudden Volume Changes",
    description:
      "Detects significant changes in sales volume (above {threshold}%) for products between {periodType}s",
    category: "Revenue Analytics",
    testFunction: suddenVolumeSpike,
    defaultConfig: {
      periodType: "month",
      threshold: 10,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "unusual_product_discounts",
    name: "Unusual Product Discounts",
    description:
      "Identifies products with discount percentages that deviate more than {threshold}% from their average discount",
    category: "Revenue Analytics",
    testFunction: unusualProductDiscounts,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },
  {
    id: "unusual_transaction_discounts",
    name: "Unusual Transaction Discounts",
    description:
      "Identifies transactions with discount percentages that deviate more than {threshold}% from the average transaction discount",
    category: "Revenue Analytics",
    testFunction: unusualTransactionDiscounts,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.SalesRegister],
  },



  // Purchase
  {
    id: "duplicate_period_invoices",
    name: "Duplicate Period Invoices",
    description:
      "Testing if there are duplicate invoices from the same vendor in the Invoice Number column",
    category: "Purchases Analytics",
    testFunction: duplicatePeriodInvoices,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PurchaseRegister],
  },
  {
    id: "sudden_purchase_price_spike",
    name: "Sudden Purchase Price Changes",
    description:
      "Checking if the purchasing price has increased or decreased by more than {threshold}% compared to the previous purchase",
    category: "Purchases Analytics",
    testFunction: suddenPurchasePriceSpike,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.PurchaseRegister],
  },
  {
    id: "sudden_purchase_volume_spike",
    name: "Sudden Purchase Volume Changes",
    description:
      "Checking if the total purchase quantity in a {periodType} has increased or decreased by more than {threshold}% compared to the previous period",
    category: "Purchases Analytics",
    testFunction: suddenPurchaseVolumeSpike,
    defaultConfig: {
      periodType: "month",
      threshold: 10,
    },
    requiredTemplates: [TemplateName.PurchaseRegister],
  },
  {
    id: "vendor_price_difference",
    name: "Vendor Price Variations",
    description:
      "Checking if the rate of an item has been purchased at more or less than {threshold}% compared to its average purchase rate",
    category: "Purchases Analytics",
    testFunction: vendorPriceDifference,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.PurchaseRegister],
  },
  {
    id: "purchase_order_quantity_mismatch",
    name: "Purchase Order Quantity Mismatch",
    description:
      "Checking if the total purchase order quantity is less than the total goods inwarded against each purchase order number",
    category: "Purchases Analytics",
    testFunction: purchaseOrderQuantityMismatch,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PurchaseRegister],
  },


  // Payroll
  {
    id: "duplicate_employee_code",
    name: "Duplicate Employee Code",
    description: "Checking for duplicate employee codes",
    category: "Pay Data Analytics",
    testFunction: duplicateEmployeeCode,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PayRegister],
  },
  {
    id: "duplicate_pan",
    name: "Duplicate PAN",
    description: "Checking for duplicate PAN numbers",
    category: "Pay Data Analytics",
    testFunction: duplicatePAN,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PayRegister],
  },
  // {
  //   id: "duplicate_aadhar",
  //   name: "Duplicate Aadhar",
  //   description: "Checking for duplicate Aadhar numbers",
  //   category: "Pay Data Analytics",
  //   testFunction: duplicateAadhar,
  //   defaultConfig: {},
  //   requiredTemplates: [TemplateName.PayRegister],
  // },
  {
    id: "duplicate_uan",
    name: "Duplicate UAN",
    description: "Checking for duplicate UAN numbers",
    category: "Pay Data Analytics",
    testFunction: duplicateUAN,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PayRegister],
  },
  {
    id: "duplicate_bank_account",
    name: "Duplicate Bank Account",
    description: "Checking for duplicate bank account numbers",
    category: "Pay Data Analytics",
    testFunction: duplicateBankAccount,
    defaultConfig: {},
    requiredTemplates: [TemplateName.PayRegister],
  },
  {
    id: "payroll_cost_spike",
    name: "Designation-wise Payroll Cost Spike",
    description:
      "Checking if the total gross salary per designation has increased or decreased by more than {threshold}% compared to the previous month",
    category: "Pay Data Analytics",
    testFunction: payrollCostSpike,
    defaultConfig: {
      threshold: 5,
    },
    requiredTemplates: [TemplateName.PayRegister],
  },



  // Receivables
  {
    id: "customer_days_outstanding",
    name: "Customer-wise Days of Sale Outstanding",
    description:
      "Calculates the number of days of sales outstanding as receivable by mapping revenue and receivables at the customer level",
    category: "Customers Analytics",
    testFunction: customerDaysOutstanding,
    defaultConfig: {
      cutOffDays: 365,
      periodOfTransaction: 365, // 90/180/270/365
    },
    requiredTemplates: [
      TemplateName.CustomerListing,
      TemplateName.SalesRegister,
    ],
  },
  {
    id: "long_outstanding_customers",
    name: "Long-outstanding Customers with Sales",
    description:
      "Identifies customers with sales transactions who have outstanding balances in the {cutOffDate} cut off date",
    category: "Customers Analytics",
    testFunction: longOutstandingCustomers,
    defaultConfig: {
      cutOffDate: new Date().toISOString().split("T")[0],
      cutOffDays: 365,
    },
    requiredTemplates: [TemplateName.CustomerListing],
  },
  {
    id: "negative_receivables",
    name: "Negative Receivable Balances",
    description: "Lists customer-wise negative receivable balances",
    category: "Customers Analytics",
    testFunction: negativeReceivables,
    defaultConfig: {},
    requiredTemplates: [TemplateName.CustomerListing],
  },



  // Payables
  {
    id: "supplier_days_outstanding",
    name: "Supplier-wise Days of Purchase Outstanding",
    description:
      "Calculates the number of days of purchase outstanding as payable by mapping purchases and payables at the supplier level",
    category: "Vendors Analytics",
    testFunction: supplierDaysOutstanding,
    defaultConfig: {
      cutOffDays: 365,
      periodOfTransaction: 365, // 90/180/270/365
    },
    requiredTemplates: [TemplateName.Vendors, TemplateName.PurchaseRegister],
  },
  {
    id: "long_outstanding_payables",
    name: "Long-outstanding Payables with Purchases",
    description:
      "Identifies suppliers with purchase transactions who have outstanding balances in the {cutOffDate} cut off date",
    category: "Vendors Analytics",
    testFunction: longOutstandingPayables,
    defaultConfig: {
      cutOffDate: new Date().toISOString().split("T")[0],
      cutOffDays: 365,
    },
    requiredTemplates: [TemplateName.Vendors],
  },
  {
    id: "negative_payables",
    name: "Negative Payable Balances",
    description: "Lists supplier-wise negative payable balances",
    category: "Vendors Analytics",
    testFunction: negativePayables,
    defaultConfig: {},
    requiredTemplates: [TemplateName.Vendors],
  },



  // Inventory
  {
    id: "negative_inventory_quantity",
    name: "Negative Inventory Quantity",
    description: "Identifies inventories with negative quantities",
    category: "Inventory Analytics",
    testFunction: negativeQuantity,
    defaultConfig: {},
    requiredTemplates: [TemplateName.InventoryRegister],
  },
  {
    id: "negative_inventory_rate",
    name: "Negative Inventory Rate",
    description: "Identifies inventories with negative rates",
    category: "Inventory Analytics",
    testFunction: negativeRate,
    defaultConfig: {},
    requiredTemplates: [TemplateName.InventoryRegister],
  },
  {
    id: "low_margin_items",
    name: "Low Margin Items",
    description:
      "Identifies items with cost greater than {marginThreshold}% of selling price",
    category: "Inventory Analytics",
    testFunction: lowMarginItems,
    defaultConfig: {
      marginThreshold: 75,
    },
    requiredTemplates: [
      TemplateName.InventoryRegister,
      TemplateName.SalesRegister,
    ],
  },
  {
    id: "no_sales_items",
    name: "Items with No Sales",
    description:
      "Identifies inventory items with no sales transactions during the year",
    category: "Inventory Analytics",
    testFunction: noSalesItems,
    defaultConfig: {},
    requiredTemplates: [
      TemplateName.InventoryRegister,
      TemplateName.SalesRegister,
    ],
  },
  {
    id: "no_movement_items",
    name: "Items with No Movement",
    description:
      "Identifies items where opening inventory quantity equals closing inventory quantity",
    category: "Inventory Analytics",
    testFunction: noMovementItems,
    defaultConfig: {},
    requiredTemplates: [TemplateName.InventoryRegister],
  },
  {
    id: "slow_moving_inventory",
    name: "Slow-moving Inventory with Purchases",
    description:
      "Identifies items with issue quantity less than opening stock and purchases during the year",
    category: "Inventory Analytics",
    testFunction: slowMovingInventory,
    defaultConfig: {},
    requiredTemplates: [
      TemplateName.InventoryRegister,
      TemplateName.PurchaseRegister,
    ],
  },

  
  // Fixed Assets
  {
    id: "capitalization_date_prior",
    name: "Capitalization Date Prior to Acquisition",
    description:
      "Identifies assets where the capitalization date is earlier than the acquisition date",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: capitalizationDatePrior,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "prior_year_capitalization",
    name: "Current Year Additions with Prior Year Capitalization",
    description:
      "Identifies assets classified as additions where the capitalization date is before the financial year start",
    category: "Fixed Assets Analytics",
    defaultConfig: {
      financialYearStart: new Date().getFullYear().toString(),
    },
    testFunction: priorYearCapitalization,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "low_value_capitalization",
    name: "Low-value Items Capitalized",
    description:
      "Lists a maximum of {maxAssets} asset codes with a total gross value below INR {valueThreshold}",
    category: "Fixed Assets Analytics",
    defaultConfig: {
      valueThreshold: 25000,
      maxAssets: 5,
      recentTransactionsCount: 5,
    },
    testFunction: lowValueCapitalization,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "negative_gross_block",
    name: "Negative Gross Block",
    description:
      "Checking for negative values in the Gross Book Value column using the asset code",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: negativeGrossBlock,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "blank_narrations",
    name: "Blank Asset Descriptions",
    description: "Identifying asset codes with no asset descriptions",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: blankNarrations,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "keyword_narrations",
    name: "Narrations with Certain Words",
    description:
      "Identifying asset codes with descriptions containing specific words",
    category: "Fixed Assets Analytics",
    defaultConfig: {
      keywords: [
        "interest",
        "processing fees",
        "transport",
        "insurance",
        "prepaid",
        "pre-operative",
      ],
      caseSensitive: false,
    },
    testFunction: keywordNarrations,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "existing_asset_additions",
    name: "Additions to Existing Assets",
    description:
      "Checking if an asset has values in both the Opening Gross Book Value and the Additions column",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: existingAssetAdditions,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "deleted_assets_with_wdv",
    name: "Deleted Assets with WDV",
    description:
      "Checking if an asset has a closing book value greater than 0 when the deletion column has a value greater than 0",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: deletedAssetsWithWDV,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "different_useful_lives",
    name: "Different Useful Lives for Same Asset Class",
    description:
      "Checking if multiple values exist in the Useful Life column for the same asset class",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: differentUsefulLives,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "same_year_procurement_deletion",
    name: "Asset Procured and Deleted in Same Year",
    description:
      "Checking if the acquisition value of an asset equals the write-off or depreciation value in the same year",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: sameYearProcurementDeletion,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
  {
    id: "duplicate_asset_codes",
    name: "Duplicate Asset Codes",
    description: "Identifying duplicate asset codes in the Asset Code column",
    category: "Fixed Assets Analytics",
    defaultConfig: {},
    testFunction: duplicateAssetCodes,
    requiredTemplates: [TemplateName.FixedAssetsRegister],
  },
];
