import journalsContainingKeywords, {
  KeywordEntry,
  KeywordsConfig,
} from "./journalsContainingKeywords";
import { describe, test, expect } from "@jest/globals";

describe("journalsContainingKeywords", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "Journal Description": "Regular transaction",
      "Entry Date": new Date("2024-03-17"),
      "User Prepared": "John",
    },
    {
      "Journal Entry Number": "JE002",
      "Journal Description": "Fraud detected in accounts",
      "Entry Date": new Date("2024-03-18"),
      "User Prepared": "Alice",
    },
    {
      "Journal Entry Number": "JE003",
      "Journal Description": "Personal trip expenses",
      "Entry Date": new Date("2024-03-17"),
      "User Prepared": "Bob",
    },
    {
      "Journal Entry Number": "JE004",
      "Journal Description": "Secret transaction by MD family",
      "Entry Date": new Date("2024-03-19"),
      "User Prepared": "Charlie",
    },
  ];

  // Test Cases
  test("identifies entries with default keywords", () => {
    const result = journalsContainingKeywords(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE003",
          description: "Personal trip expenses",
          entryDate: new Date("2024-03-17"),
          userPrepared: "Bob",
          matchedKeywords: ["Personal trip"],
        }),
        expect.objectContaining({
          journalEntryNumber: "JE002",
          description: "Fraud detected in accounts",
          entryDate: new Date("2024-03-18"),
          userPrepared: "Alice",
          matchedKeywords: ["Fraud"],
        }),
        expect.objectContaining({
          journalEntryNumber: "JE004",
          description: "Secret transaction by MD family",
          entryDate: new Date("2024-03-19"),
          userPrepared: "Charlie",
          matchedKeywords: ["Secret", "MD family"],
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles custom keywords", () => {
    const config: KeywordsConfig = {
      keywords: ["Regular", "transaction"],
      caseSensitive: false,
    };
    const result = journalsContainingKeywords(sampleGLData, config);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          description: "Regular transaction",
          entryDate: new Date("2024-03-17"),
          userPrepared: "John",
          matchedKeywords: ["Regular", "transaction"],
        }),
        expect.objectContaining({
          journalEntryNumber: "JE004",
          description: "Secret transaction by MD family",
          entryDate: new Date("2024-03-19"),
          userPrepared: "Charlie",
          matchedKeywords: ["transaction"],
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles case sensitive search", () => {
    const config: KeywordsConfig = {
      keywords: ["FRAUD", "SECRET"],
      caseSensitive: true,
    };
    const result = journalsContainingKeywords(sampleGLData, config);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = journalsContainingKeywords([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidInput: any = "not an array";
    const result = journalsContainingKeywords(invalidInput);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "GL data must be an array",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid keywords configuration", () => {
    const invalidConfig: KeywordsConfig = { keywords: [] };
    const result = journalsContainingKeywords(sampleGLData, invalidConfig);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "keywords must be a non-empty array",
      }),
    ]);
  });
});
