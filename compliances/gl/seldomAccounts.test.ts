import seldomAccounts, { SeldomAccountsConfig } from "./seldomAccounts";
import { describe, test, expect } from "@jest/globals";

describe("seldomAccounts", () => {
  // Test Data
  const sampleGLData = [
    {
      "GL Code": "1001",
      "Journal Entry Number": "JE001",
      "GL Description": "Cash Account",
    },
    {
      "GL Code": "1001",
      "Journal Entry Number": "JE002",
      "GL Description": "Cash Account",
    },
    {
      "GL Code": "2001",
      "Journal Entry Number": "JE003",
      "GL Description": "Bank Account",
    },
    {
      "GL Code": "3001",
      "Journal Entry Number": "JE004",
      "GL Description": "Petty Cash",
    },
  ];

  // Test Cases
  test("identifies accounts with less than default (5) transactions", () => {
    const result = seldomAccounts(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          glCode: "3001",
          glDescription: "Petty Cash",
          transactionCount: 1,
        }),
        expect.objectContaining({
          glCode: "2001",
          glDescription: "Bank Account",
          transactionCount: 1,
        }),
        expect.objectContaining({
          glCode: "1001",
          glDescription: "Cash Account",
          transactionCount: 2,
        }),
      ]),
    );
    expect(result.summary).toHaveLength(3);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("identifies accounts with less than specified transactions", () => {
    const config: SeldomAccountsConfig = { minimumTransactions: 3 };
    const result = seldomAccounts(sampleGLData, config);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          glCode: "3001",
          glDescription: "Petty Cash",
          transactionCount: 1,
        }),
        expect.objectContaining({
          glCode: "2001",
          glDescription: "Bank Account",
          transactionCount: 1,
        }),
        expect.objectContaining({
          glCode: "1001",
          glDescription: "Cash Account",
          transactionCount: 2,
        }),
      ]),
    );
    expect(result.summary).toHaveLength(3);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = seldomAccounts([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "GL Code": `GL${index % 10}`,
        "Journal Entry Number": `JE${index}`,
        "GL Description": `Account ${index % 10}`,
      }));
    const result = seldomAccounts(largeData, { minimumTransactions: 150 });
    expect(result.summary.length).toBeLessThanOrEqual(10);
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = seldomAccounts(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid configuration", () => {
    const invalidConfig: SeldomAccountsConfig = { minimumTransactions: -1 };
    const result = seldomAccounts(sampleGLData, invalidConfig);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "minimumTransactions must be a positive number",
      }),
    ]);
  });
});
