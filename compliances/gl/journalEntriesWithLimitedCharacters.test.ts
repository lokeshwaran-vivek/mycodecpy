import journalEntriesWithLimitedCharacters, {
  LimitedCharactersConfig,
} from "./journalEntriesWithLimitedCharacters";
import { describe, test, expect } from "@jest/globals";

describe("journalEntriesWithLimitedCharacters", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "Journal Description": "Test",
    },
    {
      "Journal Entry Number": "JE002",
      "Journal Description": "A",
    },
    {
      "Journal Entry Number": "JE003",
      "Journal Description": "Long Description",
    },
    {
      "Journal Entry Number": "JE004",
      "Journal Description": "",
    },
  ];

  // Test Cases
  test("identifies entries with less than default (5) characters", () => {
    const result = journalEntriesWithLimitedCharacters(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE004",
          description: "",
          characterCount: 0,
        }),
        expect.objectContaining({
          journalEntryNumber: "JE002",
          description: "A",
          characterCount: 1,
        }),
        expect.objectContaining({
          journalEntryNumber: "JE001",
          description: "Test",
          characterCount: 4,
        }),
      ]),
    );
    expect(result.summary).toHaveLength(3);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("identifies entries with less than specified characters", () => {
    const config: LimitedCharactersConfig = { minimumCharacters: 3 };
    const result = journalEntriesWithLimitedCharacters(sampleGLData, config);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE004",
          description: "",
          characterCount: 0,
        }),
        expect.objectContaining({
          journalEntryNumber: "JE002",
          description: "A",
          characterCount: 1,
        }),
      ]),
    );
    expect(result.summary).toHaveLength(2);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = journalEntriesWithLimitedCharacters([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "Journal Description": "A".repeat(index % 10),
      }));
    const result = journalEntriesWithLimitedCharacters(largeData);
    expect(result.summary.every((entry) => entry.characterCount < 5)).toBe(
      true,
    );
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = journalEntriesWithLimitedCharacters(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid configuration", () => {
    const result = journalEntriesWithLimitedCharacters(sampleGLData, {
      minimumCharacters: -1,
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "minimumCharacters must be a positive number",
      }),
    ]);
  });
});
