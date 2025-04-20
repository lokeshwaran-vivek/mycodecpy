import last5Digits, { Last5DigitsConfig } from "./last5Digits";
import { describe, test, expect } from "@jest/globals";

describe("last5Digits", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "Debit In Reporting Currency": 100000,
      "Credit In Reporting Currency": 123456,
    },
    {
      "Journal Entry Number": "JE002",
      "Debit In Reporting Currency": 123456,
      "Credit In Reporting Currency": 200000,
    },
    {
      "Journal Entry Number": "JE003",
      "Debit In Reporting Currency": 300000,
      "Credit In Reporting Currency": 300000,
    },
    {
      "Journal Entry Number": "JE004",
      "Debit In Reporting Currency": 123,
      "Credit In Reporting Currency": 456,
    },
  ];

  // Test Cases
  test("identifies entries with default (5) zeros at the end", () => {
    const result = last5Digits(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          debitAmount: 100000,
          creditAmount: 123456,
          repeatingDigits: {
            debit: "00000",
            credit: null,
          },
        }),
        expect.objectContaining({
          journalEntryNumber: "JE002",
          debitAmount: 123456,
          creditAmount: 200000,
          repeatingDigits: {
            debit: null,
            credit: "00000",
          },
        }),
        expect.objectContaining({
          journalEntryNumber: "JE003",
          debitAmount: 300000,
          creditAmount: 300000,
          repeatingDigits: {
            debit: "00000",
            credit: "00000",
          },
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("identifies entries with specified number of zeros", () => {
    const config: Last5DigitsConfig = { digitCount: 3 };
    const result = last5Digits(sampleGLData, config);
    expect(result.summary.length).toBe(3);
    expect(
      result.summary.every(
        (entry) =>
          entry.repeatingDigits.debit === "000" ||
          entry.repeatingDigits.credit === "000",
      ),
    ).toBe(true);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = last5Digits([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "Debit In Reporting Currency": index % 2 === 0 ? index * 100000 : index,
        "Credit In Reporting Currency":
          index % 3 === 0 ? index * 100000 : index,
      }));
    const result = last5Digits(largeData);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(
      result.summary.every(
        (entry) =>
          entry.repeatingDigits.debit !== null ||
          entry.repeatingDigits.credit !== null,
      ),
    ).toBe(true);
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = last5Digits(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid configuration", () => {
    const result = last5Digits(sampleGLData, { digitCount: -1 });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "digitCount must be a positive number",
      }),
    ]);
  });
});
