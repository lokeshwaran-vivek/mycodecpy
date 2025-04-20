import findCompoundJournalEntries from "./compoundJournalEntries";
import { describe, test, expect } from "@jest/globals";

describe("findCompoundJournalEntries", () => {
  // Test Data
  const sampleGLData = [
    { "Journal Entry Number": "JE001", "GL Code": "1001" },
    ...Array(15)
      .fill(0)
      .map((_, i) => ({
        "Journal Entry Number": "JE002",
        "GL Code": `200${i + 1}`,
      })),
    ...Array(16)
      .fill(0)
      .map((_, i) => ({
        "Journal Entry Number": "JE003",
        "GL Code": `300${i + 1}`,
      })),
    { "Journal Entry Number": "JE004", "GL Code": "4001" },
    { "Journal Entry Number": "JE004", "GL Code": "4001" }, // Duplicate
    ...Array(5)
      .fill(0)
      .map((_, i) => ({
        "Journal Entry Number": "JE005",
        "GL Code": `500${i + 1}`,
      })),
  ];

  // Test Cases
  test("identifies entries exceeding default threshold (15)", () => {
    const result = findCompoundJournalEntries(sampleGLData);
    expect(result).toEqual([
      {
        journalEntryNumber: "JE003",
        uniqueGLCodesCount: 16,
        glCodes: expect.arrayContaining(["3001", "3002", "30016"]),
      },
    ]);
  });

  test("handles custom threshold", () => {
    const result = findCompoundJournalEntries(sampleGLData, { threshold: 3 });
    expect(result.summary.map((r) => r.journalEntryNumber)).toEqual(
      expect.arrayContaining(["JE003", "JE002", "JE005"]),
    );
  });

  test("filters duplicates correctly", () => {
    const result = findCompoundJournalEntries(sampleGLData, { threshold: 0 });
    const je004 = result.summary.find((r) => r.journalEntryNumber === "JE004");
    expect(je004?.uniqueGLCodesCount).toBe(1);
  });

  test("allows zero threshold", () => {
    expect(() =>
      findCompoundJournalEntries(sampleGLData, { threshold: 0 }),
    ).not.toThrow();
  });

  test("handles empty data array", () => {
    const result = findCompoundJournalEntries([]);
    expect(result).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(0)
      .map((_, i) => ({
        "Journal Entry Number": `JE${Math.floor(i / 20)}`, // 50 unique journals
        "GL Code": `GL${i % 30}`,
      }));
    const result = findCompoundJournalEntries(largeData, { threshold: 10 });
    expect(result.summary.every((r) => r.uniqueGLCodesCount > 10)).toBe(true);
  });

  // Error Cases
  test("throws error for negative threshold", () => {
    expect(() => findCompoundJournalEntries([], { threshold: -1 })).toThrow(
      "Threshold must be a non-negative integer",
    );
  });

  test("throws error for invalid data structure", () => {
    const invalidData = [{ invalidField: "test" }] as any;
    expect(() => findCompoundJournalEntries(invalidData)).toThrow(
      "Invalid GL entry format",
    );
  });

  test("throws error for non-integer threshold", () => {
    expect(() => findCompoundJournalEntries([], { threshold: 15.5 })).toThrow(
      "Threshold must be a non-negative integer",
    );
  });
});
