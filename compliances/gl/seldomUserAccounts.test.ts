import seldomUserAccounts, {
  SeldomUserAccountsConfig,
} from "./seldomUserAccounts";
import { describe, test, expect } from "@jest/globals";

describe("seldomUserAccounts", () => {
  // Test Data
  const sampleGLData = [
    {
      "User Prepared": "John",
      "Journal Entry Number": "JE001",
    },
    {
      "User Prepared": "John",
      "Journal Entry Number": "JE002",
    },
    {
      "User Prepared": "Alice",
      "Journal Entry Number": "JE003",
    },
    {
      "User Prepared": "Bob",
      "Journal Entry Number": "JE004",
    },
  ];

  // Test Cases
  test("identifies users with less than default (5) transactions", () => {
    const result = seldomUserAccounts(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userName: "Alice", transactionCount: 1 }),
        expect.objectContaining({ userName: "Bob", transactionCount: 1 }),
        expect.objectContaining({ userName: "John", transactionCount: 2 }),
      ]),
    );
    expect(result.summary).toHaveLength(3);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("identifies users with less than specified transactions", () => {
    const config: SeldomUserAccountsConfig = { minimumTransactions: 3 };
    const result = seldomUserAccounts(sampleGLData, config);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userName: "Alice", transactionCount: 1 }),
        expect.objectContaining({ userName: "Bob", transactionCount: 1 }),
        expect.objectContaining({ userName: "John", transactionCount: 2 }),
      ]),
    );
    expect(result.summary).toHaveLength(3);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = seldomUserAccounts([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidInput: any = "not an array";
    const result = seldomUserAccounts(invalidInput);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "GL data must be an array",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid configuration", () => {
    const invalidConfig: SeldomUserAccountsConfig = { minimumTransactions: -1 };
    const result = seldomUserAccounts(sampleGLData, invalidConfig);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "minimumTransactions must be a positive number",
      }),
    ]);
  });

  test("handles entries without User Prepared field", () => {
    const invalidData = [{ "Journal Entry Number": "JE001" }] as any[];
    const result = seldomUserAccounts(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format: Entry must contain User Prepared",
      }),
    ]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "User Prepared": `User${index % 10}`,
        "Journal Entry Number": `JE${index}`,
      }));
    const result = seldomUserAccounts(largeData, { minimumTransactions: 150 });
    expect(result.summary.length).toBeLessThanOrEqual(10);
  });
});
