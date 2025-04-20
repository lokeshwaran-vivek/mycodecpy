import findEntriesBeforeDocDate from "./entriesBeforeDocDate";
import { describe, test, expect } from "@jest/globals";

describe("findEntriesBeforeDocDate", () => {
  // Test Data
  const sampleGLData = [
    {
      journalEntryNumber: "JE001",
      entryDate: new Date("2024-03-15"),
      documentDate: new Date("2024-03-20"),
      "Journal Entry Number": "JE001",
      "Entry Date": new Date("2024-03-15"),
      "Document Date": new Date("2024-03-20"),
    },
    {
      journalEntryNumber: "JE002",
      entryDate: new Date("2024-03-25"),
      documentDate: new Date("2024-03-20"),
      "Journal Entry Number": "JE002",
      "Entry Date": new Date("2024-03-25"),
      "Document Date": new Date("2024-03-20"),
    },
    {
      journalEntryNumber: "JE003",
      entryDate: new Date("2024-03-20"),
      documentDate: new Date("2024-03-20"),
      "Journal Entry Number": "JE003",
      "Entry Date": new Date("2024-03-20"),
      "Document Date": new Date("2024-03-20"),
    },
    {
      journalEntryNumber: "JE004",
      entryDate: new Date("2024-03-18"),
      documentDate: new Date("2024-03-19"),
      "Journal Entry Number": "JE004",
      "Entry Date": new Date("2024-03-18"),
      "Document Date": new Date("2024-03-19"),
    },
    {
      journalEntryNumber: "JE004", // Duplicate entry number
      entryDate: new Date("2024-03-17"),
      documentDate: new Date("2024-03-19"),
      "Journal Entry Number": "JE004",
      "Entry Date": new Date("2024-03-17"),
      "Document Date": new Date("2024-03-19"),
    },
  ];

  // Test Cases
  test("identifies entries with entry date prior to document date", () => {
    const result = findEntriesBeforeDocDate(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          entryDate: new Date("2024-03-15"),
          documentDate: new Date("2024-03-20"),
          daysDifference: 5,
        }),
        expect.objectContaining({
          journalEntryNumber: "JE004",
          entryDate: new Date("2024-03-17"),
          documentDate: new Date("2024-03-19"),
          daysDifference: 2,
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("groups violations by journal entry number", () => {
    const result = findEntriesBeforeDocDate(sampleGLData);
    const je004Entries = result.summary.filter(
      (e) => e.journalEntryNumber === "JE004",
    );
    expect(je004Entries.length).toBe(1); // Should group duplicates
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = findEntriesBeforeDocDate([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        journalEntryNumber: `JE${index}`,
        entryDate: new Date(2024, 2, 15 + (index % 5)), // March 15-19
        documentDate: new Date(2024, 2, 20), // Fixed doc date March 20
        "Journal Entry Number": `JE${index}`,
        "Entry Date": new Date(2024, 2, 15 + (index % 5)),
        "Document Date": new Date(2024, 2, 20),
      }));
    const result = findEntriesBeforeDocDate(largeData);
    expect(result.summary.length).toBe(1000); // All entries before March 20
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = findEntriesBeforeDocDate(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Missing required fields in journal entry",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid date formats", () => {
    const invalidDateData = [
      {
        journalEntryNumber: "JE001",
        entryDate: "invalid-date",
        documentDate: new Date("2024-03-20"),
        "Journal Entry Number": "JE001",
        "Entry Date": "invalid-date",
        "Document Date": new Date("2024-03-20"),
      },
    ] as any;
    const result = findEntriesBeforeDocDate(invalidDateData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid date format in journal entry",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles missing required fields", () => {
    const missingFieldData = [
      {
        journalEntryNumber: "JE001",
        entryDate: new Date("2024-03-15"),
        // Missing documentDate
        "Journal Entry Number": "JE001",
        "Entry Date": new Date("2024-03-15"),
        // Missing Document Date
      },
    ] as any;
    const result = findEntriesBeforeDocDate(missingFieldData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Missing required fields in journal entry",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });
});
